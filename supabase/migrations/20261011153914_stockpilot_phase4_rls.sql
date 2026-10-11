/*
# StockPilot Phase 4 — RLS Policies for Suppliers, Purchase Orders, PO Items

## Security
All three tables are org-scoped via get_user_org_id().
- suppliers: SELECT, INSERT, UPDATE, DELETE for authenticated users
- purchase_orders: SELECT, INSERT, UPDATE, DELETE for authenticated users
- purchase_order_items: SELECT, INSERT, UPDATE, DELETE for authenticated users
*/

-- ============================================================
-- SUPPLIERS RLS
-- ============================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_suppliers" ON suppliers;
CREATE POLICY "select_own_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "insert_own_suppliers" ON suppliers;
CREATE POLICY "insert_own_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "update_own_suppliers" ON suppliers;
CREATE POLICY "update_own_suppliers" ON suppliers FOR UPDATE
  TO authenticated USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "delete_own_suppliers" ON suppliers;
CREATE POLICY "delete_own_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (organization_id = get_user_org_id());

-- ============================================================
-- PURCHASE_ORDERS RLS
-- ============================================================
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_purchase_orders" ON purchase_orders;
CREATE POLICY "select_own_purchase_orders" ON purchase_orders FOR SELECT
  TO authenticated USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "insert_own_purchase_orders" ON purchase_orders;
CREATE POLICY "insert_own_purchase_orders" ON purchase_orders FOR INSERT
  TO authenticated WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "update_own_purchase_orders" ON purchase_orders;
CREATE POLICY "update_own_purchase_orders" ON purchase_orders FOR UPDATE
  TO authenticated USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "delete_own_purchase_orders" ON purchase_orders;
CREATE POLICY "delete_own_purchase_orders" ON purchase_orders FOR DELETE
  TO authenticated USING (organization_id = get_user_org_id());

-- ============================================================
-- PURCHASE_ORDER_ITEMS RLS
-- ============================================================
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_po_items" ON purchase_order_items;
CREATE POLICY "select_own_po_items" ON purchase_order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS "insert_own_po_items" ON purchase_order_items;
CREATE POLICY "insert_own_po_items" ON purchase_order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS "update_own_po_items" ON purchase_order_items;
CREATE POLICY "update_own_po_items" ON purchase_order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS "delete_own_po_items" ON purchase_order_items;
CREATE POLICY "delete_own_po_items" ON purchase_order_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.organization_id = get_user_org_id()
    )
  );