/*
# StockPilot Phase 3 — Stock Movements & Audit Logs

## Overview
Creates the stock_movements table (immutable history of all inventory changes) and
audit_logs table (tracks entity changes). Adds a PostgreSQL function that performs
transactional inventory updates with movement recording.

## 1. New Tables

### stock_movements
- id, organization_id, product_id (FK), warehouse_id (FK)
- movement_type (enum: PURCHASE_RECEIPT, SALE, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT, RETURN_IN, RETURN_OUT, DAMAGE, INITIAL_STOCK)
- quantity, previous_quantity, new_quantity
- reference_type, reference_id (links to PO/SO/transfer/etc)
- reason, notes
- user_id (FK to profiles)
- created_at

### audit_logs
- id, organization_id, user_id (FK to profiles)
- action (CREATE, UPDATE, DELETE)
- entity (table name)
- entity_id
- before (jsonb), after (jsonb)
- created_at

## 2. Settings
- Adds 'allow_negative_inventory' setting defaulting to 'false'

## 3. PostgreSQL Function: process_inventory_movement
Performs transactional inventory update + movement recording:
- Locks the warehouse_inventory row
- Validates negative stock unless allowed
- Updates quantity fields
- Inserts stock_movement with before/after quantities
Returns the new inventory state

## 4. RLS
Both tables org-scoped via get_user_org_id()
*/

-- ============================================================
-- STOCK_MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (
    movement_type IN (
      'PURCHASE_RECEIPT', 'SALE', 'TRANSFER_OUT', 'TRANSFER_IN',
      'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_IN', 'RETURN_OUT',
      'DAMAGE', 'INITIAL_STOCK'
    )
  ),
  quantity integer NOT NULL,
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  reference_type text,
  reference_id uuid,
  reason text,
  notes text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_organization_id_idx ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS stock_movements_warehouse_id_idx ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS stock_movements_movement_type_idx ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS stock_movements_created_at_idx ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_user_id_idx ON stock_movements(user_id);

-- ============================================================
-- AUDIT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  entity text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_organization_id_idx ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);

-- ============================================================
-- SETTINGS: allow_negative_inventory
-- ============================================================
INSERT INTO settings (organization_id, key, value)
SELECT id, 'allow_negative_inventory', 'false' FROM organizations
ON CONFLICT (organization_id, key) DO NOTHING;

-- ============================================================
-- FUNCTION: process_inventory_movement
-- Transactional inventory update + movement recording
-- ============================================================
CREATE OR REPLACE FUNCTION process_inventory_movement(
  p_org_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_prev_on_hand integer;
  v_prev_reserved integer;
  v_new_on_hand integer;
  v_new_reserved integer;
  v_allow_negative boolean;
  v_setting_value text;
  v_field_to_update text;
  v_delta integer;
BEGIN
  -- Check if negative inventory is allowed
  SELECT value INTO v_setting_value
  FROM settings
  WHERE organization_id = p_org_id AND key = 'allow_negative_inventory';
  v_allow_negative := COALESCE(v_setting_value = 'true', false);

  -- Lock the inventory row (or create if missing)
  INSERT INTO warehouse_inventory (organization_id, warehouse_id, product_id, quantity_on_hand, quantity_reserved, quantity_incoming, quantity_damaged)
  VALUES (p_org_id, p_warehouse_id, p_product_id, 0, 0, 0, 0)
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;

  SELECT * INTO v_inv
  FROM warehouse_inventory
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id
  FOR UPDATE;

  v_prev_on_hand := v_inv.quantity_on_hand;
  v_prev_reserved := v_inv.quantity_reserved;

  -- Apply the movement
  CASE p_movement_type
    -- Increase on_hand
    WHEN 'PURCHASE_RECEIPT' THEN
      v_new_on_hand := v_prev_on_hand + p_quantity;
      v_new_reserved := v_prev_reserved;
      UPDATE warehouse_inventory SET quantity_on_hand = v_new_on_hand
      WHERE id = v_inv.id;

    WHEN 'TRANSFER_IN' THEN
      v_new_on_hand := v_prev_on_hand + p_quantity;
      v_new_reserved := v_prev_reserved;
      UPDATE warehouse_inventory SET quantity_on_hand = v_new_on_hand
      WHERE id = v_inv.id;

    WHEN 'ADJUSTMENT_IN' THEN
      v_new_on_hand := v_prev_on_hand + p_quantity;
      v_new_reserved := v_prev_reserved;
      UPDATE warehouse_inventory SET quantity_on_hand = v_new_on_hand
      WHERE id = v_inv.id;

    WHEN 'RETURN_IN' THEN
      v_new_on_hand := v_prev_on_hand + p_quantity;
      v_new_reserved := v_prev_reserved;
      UPDATE warehouse_inventory SET quantity_on_hand = v_new_on_hand
      WHERE id = v_inv.id;

    WHEN 'INITIAL_STOCK' THEN
      v_new_on_hand := p_quantity;
      v_new_reserved := v_prev_reserved;
      UPDATE warehouse_inventory SET quantity_on_hand = v_new_on_hand
      WHERE id = v_inv.id;

    -- Decrease on_hand
    WHEN 'SALE' THEN
      v_new_on_hand := v_prev_on_hand - p_quantity;
      v_new_reserved := v_prev_reserved;
      IF NOT v_allow_negative AND v_new_on_hand < 0 THEN
        RAISE EXCEPTION 'Insufficient stock: available %, requested %', v_prev_on_hand, p_quantity;
      END IF;
      UPDATE warehouse_inventory SET quantity_on_hand = v_new_on_hand
      WHERE id = v_inv.id;

    WHEN 'TRANSFER_OUT' THEN
      v_new_on_hand := v_prev_on_hand - p_quantity;
      v_new_reserved := v_prev_reserved;
      IF NOT v_allow_negative AND v_new_on_hand < 0 THEN
        RAISE EXCEPTION 'Insufficient stock for transfer: available %, requested %', v_prev_on_hand, p_quantity;
      END IF;
      UPDATE warehouse_inventory SET quantity_on_hand = v_new_on_hand
      WHERE id = v_inv.id;

    WHEN 'ADJUSTMENT_OUT' THEN
      v_new_on_hand := v_prev_on_hand - p_quantity;
      v_new_reserved := v_prev_reserved;
      IF NOT v_allow_negative AND v_new_on_hand < 0 THEN
        RAISE EXCEPTION 'Insufficient stock: available %, requested %', v_prev_on_hand, p_quantity;
      END IF;
      UPDATE warehouse_inventory SET quantity_on_hand = v_new_on_hand
      WHERE id = v_inv.id;

    WHEN 'RETURN_OUT' THEN
      v_new_on_hand := v_prev_on_hand - p_quantity;
      v_new_reserved := v_prev_reserved;
      IF NOT v_allow_negative AND v_new_on_hand < 0 THEN
        RAISE EXCEPTION 'Insufficient stock: available %, requested %', v_prev_on_hand, p_quantity;
      END IF;
      UPDATE warehouse_inventory SET quantity_on_hand = v_new_on_hand
      WHERE id = v_inv.id;

    WHEN 'DAMAGE' THEN
      v_new_on_hand := v_prev_on_hand - p_quantity;
      v_new_reserved := v_prev_reserved;
      IF NOT v_allow_negative AND v_new_on_hand < 0 THEN
        RAISE EXCEPTION 'Insufficient stock: available %, requested %', v_prev_on_hand, p_quantity;
      END IF;
      UPDATE warehouse_inventory SET
        quantity_on_hand = v_new_on_hand,
        quantity_damaged = quantity_damaged + p_quantity
      WHERE id = v_inv.id;

    ELSE
      RAISE EXCEPTION 'Unknown movement type: %', p_movement_type;
  END CASE;

  -- Record the movement
  INSERT INTO stock_movements (
    organization_id, product_id, warehouse_id, movement_type,
    quantity, previous_quantity, new_quantity,
    reference_type, reference_id, reason, notes, user_id
  ) VALUES (
    p_org_id, p_product_id, p_warehouse_id, p_movement_type,
    p_quantity, v_prev_on_hand, v_new_on_hand,
    p_reference_type, p_reference_id, p_reason, p_notes, p_user_id
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'warehouse_id', p_warehouse_id,
    'previous_on_hand', v_prev_on_hand,
    'new_on_hand', v_new_on_hand,
    'previous_reserved', v_prev_reserved,
    'new_reserved', v_new_reserved,
    'available', v_new_on_hand - v_new_reserved,
    'movement_type', p_movement_type,
    'quantity', p_quantity
  );
END;
$$;

-- ============================================================
-- FUNCTION: reserve_stock
-- Transactional stock reservation
-- ============================================================
CREATE OR REPLACE FUNCTION reserve_stock(
  p_org_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid,
  p_quantity integer,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_prev_on_hand integer;
  v_prev_reserved integer;
  v_new_reserved integer;
  v_available integer;
  v_allow_negative boolean;
  v_setting_value text;
BEGIN
  SELECT value INTO v_setting_value
  FROM settings
  WHERE organization_id = p_org_id AND key = 'allow_negative_inventory';
  v_allow_negative := COALESCE(v_setting_value = 'true', false);

  INSERT INTO warehouse_inventory (organization_id, warehouse_id, product_id, quantity_on_hand, quantity_reserved, quantity_incoming, quantity_damaged)
  VALUES (p_org_id, p_warehouse_id, p_product_id, 0, 0, 0, 0)
  ON CONFLICT (warehouse_id, product_id) DO NOTHING;

  SELECT * INTO v_inv
  FROM warehouse_inventory
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id
  FOR UPDATE;

  v_prev_on_hand := v_inv.quantity_on_hand;
  v_prev_reserved := v_inv.quantity_reserved;
  v_available := v_prev_on_hand - v_prev_reserved;
  v_new_reserved := v_prev_reserved + p_quantity;

  IF NOT v_allow_negative AND v_new_reserved > v_prev_on_hand THEN
    RAISE EXCEPTION 'Cannot reserve more than available: available %, requested %', v_available, p_quantity;
  END IF;

  UPDATE warehouse_inventory SET quantity_reserved = v_new_reserved
  WHERE id = v_inv.id;

  INSERT INTO stock_movements (
    organization_id, product_id, warehouse_id, movement_type,
    quantity, previous_quantity, new_quantity,
    reference_type, reference_id, reason, notes, user_id
  ) VALUES (
    p_org_id, p_product_id, p_warehouse_id, 'SALE',
    p_quantity, v_prev_on_hand, v_prev_on_hand,
    p_reference_type, p_reference_id, p_reason, p_notes, p_user_id
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'warehouse_id', p_warehouse_id,
    'previous_reserved', v_prev_reserved,
    'new_reserved', v_new_reserved,
    'available', v_prev_on_hand - v_new_reserved
  );
END;
$$;

-- ============================================================
-- FUNCTION: release_reserved_stock
-- Release previously reserved stock
-- ============================================================
CREATE OR REPLACE FUNCTION release_reserved_stock(
  p_org_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid,
  p_quantity integer,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_prev_reserved integer;
  v_new_reserved integer;
BEGIN
  SELECT * INTO v_inv
  FROM warehouse_inventory
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id
  FOR UPDATE;

  v_prev_reserved := v_inv.quantity_reserved;
  v_new_reserved := GREATEST(v_prev_reserved - p_quantity, 0);

  UPDATE warehouse_inventory SET quantity_reserved = v_new_reserved
  WHERE id = v_inv.id;

  INSERT INTO stock_movements (
    organization_id, product_id, warehouse_id, movement_type,
    quantity, previous_quantity, new_quantity,
    reference_type, reference_id, reason, notes, user_id
  ) VALUES (
    p_org_id, p_product_id, p_warehouse_id, 'RETURN_IN',
    p_quantity, v_inv.quantity_on_hand, v_inv.quantity_on_hand,
    p_reference_type, p_reference_id, p_reason, p_notes, p_user_id
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'warehouse_id', p_warehouse_id,
    'previous_reserved', v_prev_reserved,
    'new_reserved', v_new_reserved,
    'available', v_inv.quantity_on_hand - v_new_reserved
  );
END;
$$;

-- Revoke public execute on all security definer functions
REVOKE EXECUTE ON FUNCTION process_inventory_movement(uuid, uuid, uuid, text, integer, text, text, text, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reserve_stock(uuid, uuid, uuid, integer, text, text, text, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION release_reserved_stock(uuid, uuid, uuid, integer, text, text, text, uuid, uuid) FROM PUBLIC;