/*
# StockPilot Phase 5 — RLS Policies for Customers, Sales Orders, SO Items

## Security
All three tables are org-scoped via get_user_org_id().
- customers: SELECT, INSERT, UPDATE, DELETE for authenticated users
- sales_orders: SELECT, INSERT, UPDATE, DELETE for authenticated users
- sales_order_items: SELECT, INSERT, UPDATE, DELETE for authenticated users
*/

-- ============================================================
-- CUSTOMERS RLS
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_customers" ON customers;
CREATE POLICY "select_own_customers" ON customers FOR SELECT
  TO authenticated USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "insert_own_customers" ON customers;
CREATE POLICY "insert_own_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "update_own_customers" ON customers;
CREATE POLICY "update_own_customers" ON customers FOR UPDATE
  TO authenticated USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "delete_own_customers" ON customers;
CREATE POLICY "delete_own_customers" ON customers FOR DELETE
  TO authenticated USING (organization_id = get_user_org_id());

-- ============================================================
-- SALES_ORDERS RLS
-- ============================================================
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sales_orders" ON sales_orders;
CREATE POLICY "select_own_sales_orders" ON sales_orders FOR SELECT
  TO authenticated USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "insert_own_sales_orders" ON sales_orders;
CREATE POLICY "insert_own_sales_orders" ON sales_orders FOR INSERT
  TO authenticated WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "update_own_sales_orders" ON sales_orders;
CREATE POLICY "update_own_sales_orders" ON sales_orders FOR UPDATE
  TO authenticated USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "delete_own_sales_orders" ON sales_orders;
CREATE POLICY "delete_own_sales_orders" ON sales_orders FOR DELETE
  TO authenticated USING (organization_id = get_user_org_id());

-- ============================================================
-- SALES_ORDER_ITEMS RLS
-- ============================================================
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_so_items" ON sales_order_items;
CREATE POLICY "select_own_so_items" ON sales_order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE sales_orders.id = sales_order_items.sales_order_id
      AND sales_orders.organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS "insert_own_so_items" ON sales_order_items;
CREATE POLICY "insert_own_so_items" ON sales_order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE sales_orders.id = sales_order_items.sales_order_id
      AND sales_orders.organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS "update_own_so_items" ON sales_order_items;
CREATE POLICY "update_own_so_items" ON sales_order_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE sales_orders.id = sales_order_items.sales_order_id
      AND sales_orders.organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS "delete_own_so_items" ON sales_order_items;
CREATE POLICY "delete_own_so_items" ON sales_order_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE sales_orders.id = sales_order_items.sales_order_id
      AND sales_orders.organization_id = get_user_org_id()
    )
  );