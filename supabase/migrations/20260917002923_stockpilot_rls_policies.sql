/*
# StockPilot RLS Policies — Multi-Tenant Access Control

## Overview
Enables Row Level Security on all foundation tables and creates policies that enforce
multi-tenant isolation. Users can only access data within their own organization.

## Security Model
- **organizations**: Users can read/update their own org (verified via profiles membership)
- **profiles**: Users can read their own profile + profiles in their org; update only their own
- **roles / permissions / role_permissions**: Readable by all authenticated users (reference data)
- **user_roles**: Scoped to the user's organization (read/insert/update/delete)
- **settings**: Scoped to the user's organization (full CRUD)

## Policy Pattern
All ownership checks use `auth.uid()` and verify organization membership via:
  `(SELECT organization_id FROM profiles WHERE id = auth.uid())`
*/

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_own" ON organizations;
CREATE POLICY "org_select_own" ON organizations FOR SELECT
  TO authenticated
  USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "org_update_own" ON organizations;
CREATE POLICY "org_update_own" ON organizations FOR UPDATE
  TO authenticated
  USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_select_own" ON profiles;
CREATE POLICY "profile_select_own" ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR organization_id = (SELECT organization_id FROM profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "profile_insert_own" ON profiles;
CREATE POLICY "profile_insert_own" ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profile_update_own" ON profiles;
CREATE POLICY "profile_update_own" ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- ROLES (reference data — readable by all authenticated)
-- ============================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select_all" ON roles;
CREATE POLICY "roles_select_all" ON roles FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- PERMISSIONS (reference data — readable by all authenticated)
-- ============================================================
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perms_select_all" ON permissions;
CREATE POLICY "perms_select_all" ON permissions FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- ROLE_PERMISSIONS (reference data — readable by all authenticated)
-- ============================================================
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_perms_select_all" ON role_permissions;
CREATE POLICY "role_perms_select_all" ON role_permissions FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- USER_ROLES (org-scoped)
-- ============================================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
CREATE POLICY "user_roles_select_own" ON user_roles FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "user_roles_insert_own" ON user_roles;
CREATE POLICY "user_roles_insert_own" ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "user_roles_update_own" ON user_roles;
CREATE POLICY "user_roles_update_own" ON user_roles FOR UPDATE
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "user_roles_delete_own" ON user_roles;
CREATE POLICY "user_roles_delete_own" ON user_roles FOR DELETE
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- SETTINGS (org-scoped)
-- ============================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_own" ON settings;
CREATE POLICY "settings_select_own" ON settings FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "settings_insert_own" ON settings;
CREATE POLICY "settings_insert_own" ON settings FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "settings_update_own" ON settings;
CREATE POLICY "settings_update_own" ON settings FOR UPDATE
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "settings_delete_own" ON settings;
CREATE POLICY "settings_delete_own" ON settings FOR DELETE
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));