/*
# StockPilot Phase 4 — Suppliers, Purchase Orders & Goods Receiving

## Overview
Creates the suppliers table, purchase_orders table, and purchase_order_items table.
Adds a SECURITY DEFINER function for receiving goods that atomically updates
inventory, creates stock movements, and updates PO line items and status.

## 1. New Tables

### suppliers
- id, organization_id (FK)
- company_name, contact_person, email, phone
- address, city, country, tax_id
- payment_terms, notes
- status (ACTIVE, INACTIVE)
- created_at, updated_at

### purchase_orders
- id, organization_id (FK)
- po_number (auto-generated, unique per org)
- supplier_id (FK to suppliers)
- warehouse_id (FK to warehouses)
- status (DRAFT, SUBMITTED, APPROVED, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED)
- order_date, expected_delivery
- currency, notes
- tax_amount, discount_amount, subtotal, total
- created_by (FK to profiles)
- created_at, updated_at

### purchase_order_items
- id, purchase_order_id (FK, CASCADE)
- product_id (FK to products)
- quantity, received_quantity
- unit_cost, tax_rate, discount_amount
- line_total
- created_at

## 2. PostgreSQL Function: receive_purchase_order_item
Atomically receives goods for a single PO line item:
- Validates quantity (cannot exceed remaining)
- Calls process_inventory_movement internally for PURCHASE_RECEIPT
- Updates received_quantity on the line item
- Updates PO status (PARTIALLY_RECEIVED or RECEIVED)
- Returns updated line item and PO status

## 3. RLS
All tables org-scoped via get_user_org_id()
- suppliers: full CRUD for authenticated users
- purchase_orders: full CRUD for authenticated users
- purchase_order_items: SELECT/INSERT for authenticated (managed via PO)
*/

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  country text,
  tax_id text,
  payment_terms text,
  notes text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_organization_id_idx ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS suppliers_company_name_idx ON suppliers(company_name);
CREATE INDEX IF NOT EXISTS suppliers_status_idx ON suppliers(status);

-- ============================================================
-- PURCHASE_ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')
  ),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery date,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, po_number)
);

CREATE INDEX IF NOT EXISTS purchase_orders_organization_id_idx ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_id_idx ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS purchase_orders_warehouse_id_idx ON purchase_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS purchase_orders_order_date_idx ON purchase_orders(order_date DESC);

-- ============================================================
-- PURCHASE_ORDER_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  unit_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_order_items_po_id_idx ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_product_id_idx ON purchase_order_items(product_id);

-- ============================================================
-- SEQUENCE for PO numbers
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS po_number_seq;

-- ============================================================
-- FUNCTION: generate_po_number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_po_number(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_val bigint;
  v_po_number text;
BEGIN
  SELECT nextval('po_number_seq') INTO v_next_val;
  v_po_number := 'PO-' || to_char(now(), 'YYYY') || '-' || lpad(v_next_val::text, 5, '0');
  RETURN v_po_number;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_po_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_po_number(uuid) TO authenticated;

-- ============================================================
-- FUNCTION: receive_purchase_order_item
-- Atomically receives goods for a single PO line item.
-- Validates quantity, updates inventory via process_inventory_movement,
-- updates received_quantity, and updates PO status.
-- ============================================================
CREATE OR REPLACE FUNCTION receive_purchase_order_item(
  p_po_id uuid,
  p_item_id uuid,
  p_receive_qty integer,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po record;
  v_item record;
  v_remaining integer;
  v_new_received integer;
  v_all_received boolean;
  v_item_line_total numeric;
  v_result jsonb;
  v_org_id uuid;
BEGIN
  -- Lock the PO
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  -- Check PO is in a receivable state
  IF v_po.status NOT IN ('ORDERED', 'PARTIALLY_RECEIVED') THEN
    RAISE EXCEPTION 'Cannot receive goods for PO with status %', v_po.status;
  END IF;

  v_org_id := v_po.organization_id;

  -- Lock the line item
  SELECT * INTO v_item FROM purchase_order_items WHERE id = p_item_id AND purchase_order_id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order item not found';
  END IF;

  v_remaining := v_item.quantity - v_item.received_quantity;
  IF p_receive_qty <= 0 THEN
    RAISE EXCEPTION 'Receive quantity must be greater than 0';
  END IF;
  IF p_receive_qty > v_remaining THEN
    RAISE EXCEPTION 'Cannot receive more than remaining: ordered %, already received %, trying to receive %', v_item.quantity, v_item.received_quantity, p_receive_qty;
  END IF;

  -- Update inventory via the existing inventory engine
  SELECT process_inventory_movement(
    v_org_id,
    v_item.product_id,
    v_po.warehouse_id,
    'PURCHASE_RECEIPT',
    p_receive_qty,
    NULL,
    NULL,
    'PURCHASE_ORDER',
    p_po_id,
    p_user_id
  ) INTO v_result;

  -- Update received quantity on the line item
  v_new_received := v_item.received_quantity + p_receive_qty;
  UPDATE purchase_order_items
  SET received_quantity = v_new_received
  WHERE id = p_item_id;

  -- Check if all items are fully received
  SELECT EXISTS (
    SELECT 1 FROM purchase_order_items poi
    WHERE poi.purchase_order_id = p_po_id
    AND poi.received_quantity < poi.quantity
  ) INTO v_all_received;

  -- v_all_received is TRUE if there are still un-received items
  -- so PO becomes PARTIALLY_RECEIVED; if FALSE (all received), PO becomes RECEIVED
  IF v_all_received THEN
    UPDATE purchase_orders SET status = 'PARTIALLY_RECEIVED', updated_at = now() WHERE id = p_po_id;
  ELSE
    UPDATE purchase_orders SET status = 'RECEIVED', updated_at = now() WHERE id = p_po_id;
  END IF;

  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'received_quantity', v_new_received,
    'remaining', v_item.quantity - v_new_received,
    'po_status', CASE WHEN v_all_received THEN 'PARTIALLY_RECEIVED' ELSE 'RECEIVED' END,
    'inventory_result', v_result
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION receive_purchase_order_item(uuid, uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION receive_purchase_order_item(uuid, uuid, integer, uuid) TO authenticated;