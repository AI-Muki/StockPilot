/*
# StockPilot Phase 2 — RLS Policies

## Overview
Enables RLS on categories, products, warehouses, and warehouse_inventory.
All tables are org-scoped: users can only access data within their organization.

## Policy Pattern
- SELECT: organization_id = get_user_org_id()
- INSERT: WITH CHECK organization_id = get_user_org_id()
- UPDATE: USING + WITH CHECK organization_id = get_user_org_id()
- DELETE: USING organization_id = get_user_org_id()
*/

-- ============================================================
-- CATEGORIES
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cat_select_own" ON categories;
CREATE POLICY "cat_select_own" ON categories FOR SELECT
  TO authenticated USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "cat_insert_own" ON categories;
CREATE POLICY "cat_insert_own" ON categories FOR INSERT
  TO authenticated WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "cat_update_own" ON categories;
CREATE POLICY "cat_update_own" ON categories FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "cat_delete_own" ON categories;
CREATE POLICY "cat_delete_own" ON categories FOR DELETE
  TO authenticated USING (organization_id = get_user_org_id());

-- ============================================================
-- PRODUCTS
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prod_select_own" ON products;
CREATE POLICY "prod_select_own" ON products FOR SELECT
  TO authenticated USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "prod_insert_own" ON products;
CREATE POLICY "prod_insert_own" ON products FOR INSERT
  TO authenticated WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "prod_update_own" ON products;
CREATE POLICY "prod_update_own" ON products FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "prod_delete_own" ON products;
CREATE POLICY "prod_delete_own" ON products FOR DELETE
  TO authenticated USING (organization_id = get_user_org_id());

-- ============================================================
-- WAREHOUSES
-- ============================================================
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wh_select_own" ON warehouses;
CREATE POLICY "wh_select_own" ON warehouses FOR SELECT
  TO authenticated USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "wh_insert_own" ON warehouses;
CREATE POLICY "wh_insert_own" ON warehouses FOR INSERT
  TO authenticated WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "wh_update_own" ON warehouses;
CREATE POLICY "wh_update_own" ON warehouses FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "wh_delete_own" ON warehouses;
CREATE POLICY "wh_delete_own" ON warehouses FOR DELETE
  TO authenticated USING (organization_id = get_user_org_id());

-- ============================================================
-- WAREHOUSE_INVENTORY
-- ============================================================
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_select_own" ON warehouse_inventory;
CREATE POLICY "inv_select_own" ON warehouse_inventory FOR SELECT
  TO authenticated USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "inv_insert_own" ON warehouse_inventory;
CREATE POLICY "inv_insert_own" ON warehouse_inventory FOR INSERT
  TO authenticated WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "inv_update_own" ON warehouse_inventory;
CREATE POLICY "inv_update_own" ON warehouse_inventory FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "inv_delete_own" ON warehouse_inventory;
CREATE POLICY "inv_delete_own" ON warehouse_inventory FOR DELETE
  TO authenticated USING (organization_id = get_user_org_id());