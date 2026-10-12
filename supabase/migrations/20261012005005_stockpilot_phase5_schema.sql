/*
# StockPilot Phase 5 — Customers, Sales Orders, Reservation & Fulfillment

## Overview
Creates customers, sales_orders, and sales_order_items tables.
Adds SECURITY DEFINER functions for:
  - confirm_sales_order: reserves stock for all line items
  - fulfill_sales_order_item: reduces on-hand, releases reservation, creates SALE movement
  - cancel_sales_order: releases all reservations

## 1. New Tables

### customers
- id, organization_id (FK)
- company_name, contact_person, email, phone
- address, city, country, tax_id, notes
- status (ACTIVE, INACTIVE)
- created_at, updated_at

### sales_orders
- id, organization_id (FK)
- so_number (auto-generated, unique per org)
- customer_id (FK to customers)
- warehouse_id (FK to warehouses)
- status (DRAFT, CONFIRMED, PROCESSING, PARTIALLY_FULFILLED, FULFILLED, CANCELLED)
- payment_status (UNPAID, PARTIALLY_PAID, PAID)
- order_date, delivery_date
- currency, notes
- subtotal, tax_amount, discount_amount, total
- created_by (FK to profiles)
- created_at, updated_at

### sales_order_items
- id, sales_order_id (FK, CASCADE)
- product_id (FK to products)
- quantity, reserved_quantity, fulfilled_quantity
- unit_price, tax_rate, discount_amount
- line_total
- created_at
*/

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
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
  notes text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_organization_id_idx ON customers(organization_id);
CREATE INDEX IF NOT EXISTS customers_company_name_idx ON customers(company_name);
CREATE INDEX IF NOT EXISTS customers_status_idx ON customers(status);

-- ============================================================
-- SALES_ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  so_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED')
  ),
  payment_status text NOT NULL DEFAULT 'UNPAID' CHECK (
    payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')
  ),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_date date,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, so_number)
);

CREATE INDEX IF NOT EXISTS sales_orders_organization_id_idx ON sales_orders(organization_id);
CREATE INDEX IF NOT EXISTS sales_orders_customer_id_idx ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS sales_orders_warehouse_id_idx ON sales_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS sales_orders_status_idx ON sales_orders(status);
CREATE INDEX IF NOT EXISTS sales_orders_order_date_idx ON sales_orders(order_date DESC);

-- ============================================================
-- SALES_ORDER_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  reserved_quantity integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  fulfilled_quantity integer NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_order_items_so_id_idx ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS sales_order_items_product_id_idx ON sales_order_items(product_id);

-- ============================================================
-- SEQUENCE for SO numbers
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS so_number_seq;

-- ============================================================
-- FUNCTION: generate_so_number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_so_number(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_val bigint;
  v_so_number text;
BEGIN
  SELECT nextval('so_number_seq') INTO v_next_val;
  v_so_number := 'SO-' || to_char(now(), 'YYYY') || '-' || lpad(v_next_val::text, 5, '0');
  RETURN v_so_number;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_so_number(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generate_so_number(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION generate_so_number(uuid) TO authenticated;

-- ============================================================
-- FUNCTION: confirm_sales_order
-- Reserves stock for all line items.
-- Validates available stock before reserving.
-- Updates SO status to CONFIRMED.
-- ============================================================
CREATE OR REPLACE FUNCTION confirm_sales_order(
  p_so_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_so record;
  v_org_id uuid;
  v_item record;
  v_inv record;
  v_available integer;
  v_total_available integer;
  v_errors text[] := ARRAY[]::text[];
  v_reserved_count integer := 0;
  v_result jsonb;
BEGIN
  -- Lock the SO
  SELECT * INTO v_so FROM sales_orders WHERE id = p_so_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;

  IF v_so.status != 'DRAFT' THEN
    RAISE EXCEPTION 'Only DRAFT orders can be confirmed. Current status: %', v_so.status;
  END IF;

  v_org_id := v_so.organization_id;

  -- Pre-check: validate available stock for all items
  FOR v_item IN
    SELECT soi.*, p.name as product_name
    FROM sales_order_items soi
    JOIN products p ON p.id = soi.product_id
    WHERE soi.sales_order_id = p_so_id
  LOOP
    SELECT quantity_on_hand, quantity_reserved INTO v_inv
    FROM warehouse_inventory
    WHERE warehouse_id = v_so.warehouse_id AND product_id = v_item.product_id;

    v_total_available := COALESCE(v_inv.quantity_on_hand, 0) - COALESCE(v_inv.quantity_reserved, 0);
    v_available := v_total_available - v_item.quantity;

    IF v_available < 0 THEN
      v_errors := array_append(v_errors,
        'Insufficient stock for "' || v_item.product_name || '": needed ' ||
        v_item.quantity || ', available ' || v_total_available
      );
    END IF;
  END LOOP;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Cannot confirm order: %', array_to_string(v_errors, '; ');
  END IF;

  -- Reserve stock for each item
  FOR v_item IN
    SELECT * FROM sales_order_items WHERE sales_order_id = p_so_id
  LOOP
    SELECT reserve_stock(
      v_org_id,
      v_item.product_id,
      v_so.warehouse_id,
      v_item.quantity,
      'Sales order confirmation',
      NULL,
      'SALES_ORDER',
      p_so_id,
      p_user_id
    ) INTO v_result;

    UPDATE sales_order_items
    SET reserved_quantity = v_item.quantity
    WHERE id = v_item.id;

    v_reserved_count := v_reserved_count + 1;
  END LOOP;

  -- Update SO status
  UPDATE sales_orders SET status = 'CONFIRMED', updated_at = now() WHERE id = p_so_id;

  RETURN jsonb_build_object(
    'so_id', p_so_id,
    'status', 'CONFIRMED',
    'items_reserved', v_reserved_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION confirm_sales_order(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION confirm_sales_order(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION confirm_sales_order(uuid, uuid) TO authenticated;

-- ============================================================
-- FUNCTION: fulfill_sales_order_item
-- Fulfills a single line item:
-- - Validates fulfilled qty does not exceed (quantity - already fulfilled)
-- - Reduces on-hand inventory via process_inventory_movement (SALE)
-- - Releases the reservation for the fulfilled qty
-- - Updates fulfilled_quantity on the line item
-- - Updates SO status (PROCESSING, PARTIALLY_FULFILLED, or FULFILLED)
-- ============================================================
CREATE OR REPLACE FUNCTION fulfill_sales_order_item(
  p_so_id uuid,
  p_item_id uuid,
  p_fulfill_qty integer,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_so record;
  v_org_id uuid;
  v_item record;
  v_remaining integer;
  v_new_fulfilled integer;
  v_all_fulfilled boolean;
  v_has_unfulfilled boolean;
  v_inv_result jsonb;
  v_release_result jsonb;
BEGIN
  -- Lock the SO
  SELECT * INTO v_so FROM sales_orders WHERE id = p_so_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;

  IF v_so.status NOT IN ('CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED') THEN
    RAISE EXCEPTION 'Cannot fulfill order with status: %', v_so.status;
  END IF;

  v_org_id := v_so.organization_id;

  -- Lock the line item
  SELECT * INTO v_item FROM sales_order_items
  WHERE id = p_item_id AND sales_order_id = p_so_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order item not found';
  END IF;

  v_remaining := v_item.quantity - v_item.fulfilled_quantity;
  IF p_fulfill_qty <= 0 THEN
    RAISE EXCEPTION 'Fulfill quantity must be greater than 0';
  END IF;
  IF p_fulfill_qty > v_remaining THEN
    RAISE EXCEPTION 'Cannot fulfill more than remaining: ordered %, already fulfilled %, trying to fulfill %',
      v_item.quantity, v_item.fulfilled_quantity, p_fulfill_qty;
  END IF;

  -- 1. Reduce on-hand inventory (SALE movement)
  SELECT process_inventory_movement(
    v_org_id,
    v_item.product_id,
    v_so.warehouse_id,
    'SALE',
    p_fulfill_qty,
    'Sales order fulfillment',
    NULL,
    'SALES_ORDER',
    p_so_id,
    p_user_id
  ) INTO v_inv_result;

  -- 2. Release the reservation for the fulfilled quantity
  SELECT release_reserved_stock(
    v_org_id,
    v_item.product_id,
    v_so.warehouse_id,
    p_fulfill_qty,
    'Fulfillment - release reservation',
    NULL,
    'SALES_ORDER',
    p_so_id,
    p_user_id
  ) INTO v_release_result;

  -- 3. Update fulfilled quantity on the line item
  v_new_fulfilled := v_item.fulfilled_quantity + p_fulfill_qty;
  UPDATE sales_order_items
  SET fulfilled_quantity = v_new_fulfilled
  WHERE id = p_item_id;

  -- 4. Update SO status
  -- Check if any items still have unfulfilled quantity
  SELECT EXISTS (
    SELECT 1 FROM sales_order_items soi
    WHERE soi.sales_order_id = p_so_id
    AND soi.fulfilled_quantity < soi.quantity
  ) INTO v_has_unfulfilled;

  IF v_has_unfulfilled THEN
    -- Some items still pending
    IF v_so.status = 'CONFIRMED' THEN
      UPDATE sales_orders SET status = 'PROCESSING', updated_at = now() WHERE id = p_so_id;
    ELSE
      UPDATE sales_orders SET status = 'PARTIALLY_FULFILLED', updated_at = now() WHERE id = p_so_id;
    END IF;
  ELSE
    -- All items fulfilled
    UPDATE sales_orders SET status = 'FULFILLED', updated_at = now() WHERE id = p_so_id;
  END IF;

  RETURN jsonb_build_object(
    'item_id', p_item_id,
    'fulfilled_quantity', v_new_fulfilled,
    'remaining', v_item.quantity - v_new_fulfilled,
    'so_status', CASE WHEN v_has_unfulfilled THEN
      CASE WHEN v_so.status = 'CONFIRMED' THEN 'PROCESSING' ELSE 'PARTIALLY_FULFILLED' END
    ELSE 'FULFILLED' END,
    'inventory_result', v_inv_result
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION fulfill_sales_order_item(uuid, uuid, integer, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fulfill_sales_order_item(uuid, uuid, integer, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION fulfill_sales_order_item(uuid, uuid, integer, uuid) TO authenticated;

-- ============================================================
-- FUNCTION: cancel_sales_order
-- Releases all reservations for a confirmed/processing order.
-- Does NOT create SALE movements.
-- Only allowed from CONFIRMED, PROCESSING, or PARTIALLY_FULFILLED.
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_sales_order(
  p_so_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_so record;
  v_org_id uuid;
  v_item record;
  v_release_result jsonb;
  v_released_count integer := 0;
BEGIN
  SELECT * INTO v_so FROM sales_orders WHERE id = p_so_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;

  IF v_so.status NOT IN ('CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED') THEN
    RAISE EXCEPTION 'Cannot cancel order with status: %', v_so.status;
  END IF;

  v_org_id := v_so.organization_id;

  -- Release reservations for all items that have reserved quantity
  FOR v_item IN
    SELECT * FROM sales_order_items WHERE sales_order_id = p_so_id
  LOOP
    IF v_item.reserved_quantity > 0 THEN
      -- Only release the unfulfilled portion of the reservation
      DECLARE
        v_unfulfilled_reserved integer;
      BEGIN
        v_unfulfilled_reserved := v_item.reserved_quantity - v_item.fulfilled_quantity;
        IF v_unfulfilled_reserved > 0 THEN
          SELECT release_reserved_stock(
            v_org_id,
            v_item.product_id,
            v_so.warehouse_id,
            v_unfulfilled_reserved,
            'Sales order cancellation',
            NULL,
            'SALES_ORDER',
            p_so_id,
            p_user_id
          ) INTO v_release_result;

          UPDATE sales_order_items
          SET reserved_quantity = v_item.fulfilled_quantity
          WHERE id = v_item.id;

          v_released_count := v_released_count + 1;
        END IF;
      END;
    END IF;
  END LOOP;

  UPDATE sales_orders SET status = 'CANCELLED', updated_at = now() WHERE id = p_so_id;

  RETURN jsonb_build_object(
    'so_id', p_so_id,
    'status', 'CANCELLED',
    'reservations_released', v_released_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_sales_order(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cancel_sales_order(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION cancel_sales_order(uuid, uuid) TO authenticated;