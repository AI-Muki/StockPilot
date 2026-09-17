/*
# StockPilot Foundation Schema — Tables, Indexes, Triggers

## Overview
Creates the core database tables for StockPilot, a multi-tenant inventory management SaaS.
This migration creates all tables, indexes, helper functions, triggers, and seed data.
RLS policies are applied in a follow-up migration so table references resolve correctly.

## 1. New Tables
### organizations — top-level tenant entity
### profiles — extends auth.users with org membership
### roles — system role definitions (OWNER, ADMIN, etc.)
### permissions — granular permission codes (products.view, etc.)
### role_permissions — junction between roles and permissions
### user_roles — assigns one role per user per organization
### settings — organization-scoped key-value settings

## 2. Indexes on frequently queried fields
## 3. Helper functions: get_user_org_id(), has_permission()
## 4. Triggers: auto-create profile on signup, updated_at maintenance
## 5. Seed data: 7 roles, 20 permissions, role-permission mappings, demo org
*/

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_organization_id_idx ON profiles(organization_id);

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  module text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROLE_PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_id_idx ON role_permissions(permission_id);

-- ============================================================
-- USER_ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_organization_id_idx ON user_roles(organization_id);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

CREATE INDEX IF NOT EXISTS settings_organization_id_idx ON settings(organization_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION has_permission(p_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.code = p_code
  );
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED: ROLES
-- ============================================================
INSERT INTO roles (name, description, is_system) VALUES
  ('OWNER', 'Full access to all features and settings', true),
  ('ADMIN', 'Manage users, settings, and all operational data', true),
  ('WAREHOUSE_MANAGER', 'Manage warehouses, inventory, and transfers', true),
  ('INVENTORY_MANAGER', 'View and adjust inventory levels', true),
  ('SALES', 'Create and fulfill sales orders', true),
  ('PURCHASING', 'Create and receive purchase orders', true),
  ('VIEWER', 'Read-only access to all data', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED: PERMISSIONS
-- ============================================================
INSERT INTO permissions (code, description, module) VALUES
  ('products.view', 'View products', 'products'),
  ('products.create', 'Create products', 'products'),
  ('products.update', 'Update products', 'products'),
  ('products.delete', 'Delete products', 'products'),
  ('inventory.view', 'View inventory levels', 'inventory'),
  ('inventory.adjust', 'Adjust inventory levels', 'inventory'),
  ('inventory.transfer', 'Transfer stock between warehouses', 'inventory'),
  ('warehouses.manage', 'Manage warehouses', 'warehouses'),
  ('purchases.view', 'View purchase orders', 'purchases'),
  ('purchases.create', 'Create purchase orders', 'purchases'),
  ('purchases.approve', 'Approve purchase orders', 'purchases'),
  ('purchases.receive', 'Receive purchase orders', 'purchases'),
  ('sales.view', 'View sales orders', 'sales'),
  ('sales.create', 'Create sales orders', 'sales'),
  ('sales.fulfill', 'Fulfill sales orders', 'sales'),
  ('suppliers.manage', 'Manage suppliers', 'suppliers'),
  ('customers.manage', 'Manage customers', 'customers'),
  ('reports.view', 'View reports and analytics', 'reports'),
  ('users.manage', 'Manage users and roles', 'users'),
  ('settings.manage', 'Manage organization settings', 'settings')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: ROLE_PERMISSIONS
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'OWNER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND p.code != 'users.manage'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'WAREHOUSE_MANAGER'
  AND p.code IN (
    'products.view', 'products.create', 'products.update',
    'inventory.view', 'inventory.adjust', 'inventory.transfer',
    'warehouses.manage',
    'purchases.view', 'purchases.receive',
    'sales.view', 'sales.fulfill',
    'reports.view'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'INVENTORY_MANAGER'
  AND p.code IN (
    'products.view', 'products.create', 'products.update',
    'inventory.view', 'inventory.adjust',
    'purchases.view', 'purchases.receive',
    'sales.view',
    'reports.view'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SALES'
  AND p.code IN (
    'products.view', 'inventory.view',
    'sales.view', 'sales.create', 'sales.fulfill',
    'customers.manage', 'reports.view'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'PURCHASING'
  AND p.code IN (
    'products.view', 'products.create', 'products.update',
    'inventory.view',
    'purchases.view', 'purchases.create', 'purchases.receive',
    'suppliers.manage', 'reports.view'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'VIEWER' AND p.code LIKE '%.view'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: DEMO ORGANIZATION
-- ============================================================
INSERT INTO organizations (name, slug)
VALUES ('NovaTech Distribution', 'novatech-distribution')
ON CONFLICT (slug) DO NOTHING;