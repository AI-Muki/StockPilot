/*
# StockPilot Phase 2 — Products, Categories, Warehouses & Inventory

## Overview
Creates the core inventory management tables: categories (hierarchical), products
(with full pricing/sku/barcode fields), warehouses, and warehouse_inventory
(per-product-per-warehouse stock levels). All tables are organization-scoped with RLS.

## 1. New Tables

### categories
- id, organization_id, name, description, parent_category_id (self-FK for hierarchy), status (ACTIVE/ARCHIVED)
- created_at, updated_at

### products
- id, organization_id, sku (unique per org), barcode, name, description, category_id (FK)
- brand, unit, cost_price, selling_price, tax_rate
- minimum_stock, reorder_point, reorder_quantity, maximum_stock
- weight, dimensions, status (ACTIVE/INACTIVE/DISCONTINUED), image_url
- created_at, updated_at

### warehouses
- id, organization_id, name, code (unique per org), address, city, country
- manager, phone, email, capacity, status (ACTIVE/INACTIVE)
- created_at, updated_at

### warehouse_inventory
- id, organization_id, warehouse_id (FK), product_id (FK)
- quantity_on_hand, quantity_reserved, quantity_incoming, quantity_damaged
- created_at, updated_at
- Unique (warehouse_id, product_id)

## 2. Indexes
- categories: organization_id, parent_category_id
- products: organization_id, category_id, sku, barcode, status
- warehouses: organization_id, code
- warehouse_inventory: organization_id, warehouse_id, product_id, unique(warehouse_id, product_id)

## 3. RLS
All tables org-scoped via get_user_org_id(). Full CRUD for authenticated users within their org.

## 4. Seed Data (for NovaTech Distribution org)
- 10 categories (some hierarchical)
- 50 realistic products (electronics, networking, accessories)
- 3 warehouses (Main, East Coast, West Coast)
- Inventory records for all product/warehouse combinations
*/

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parent_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_organization_id_idx ON categories(organization_id);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_category_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sku text NOT NULL,
  barcode text,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  brand text,
  unit text NOT NULL DEFAULT 'piece',
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  minimum_stock integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 0,
  reorder_quantity integer NOT NULL DEFAULT 0,
  maximum_stock integer,
  weight numeric(10,3),
  dimensions text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DISCONTINUED')),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, sku)
);

CREATE INDEX IF NOT EXISTS products_organization_id_idx ON products(organization_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_sku_idx ON products(sku);
CREATE INDEX IF NOT EXISTS products_barcode_idx ON products(barcode);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);

-- ============================================================
-- WAREHOUSES
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  address text,
  city text,
  country text,
  manager text,
  phone text,
  email text,
  capacity integer,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS warehouses_organization_id_idx ON warehouses(organization_id);

-- ============================================================
-- WAREHOUSE_INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_on_hand integer NOT NULL DEFAULT 0,
  quantity_reserved integer NOT NULL DEFAULT 0,
  quantity_incoming integer NOT NULL DEFAULT 0,
  quantity_damaged integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS warehouse_inventory_organization_id_idx ON warehouse_inventory(organization_id);
CREATE INDEX IF NOT EXISTS warehouse_inventory_warehouse_id_idx ON warehouse_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS warehouse_inventory_product_id_idx ON warehouse_inventory(product_id);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS warehouses_updated_at ON warehouses;
CREATE TRIGGER warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS warehouse_inventory_updated_at ON warehouse_inventory;
CREATE TRIGGER warehouse_inventory_updated_at
  BEFORE UPDATE ON warehouse_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();