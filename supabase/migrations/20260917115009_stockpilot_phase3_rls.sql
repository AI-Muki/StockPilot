/*
# StockPilot Phase 3 — RLS Policies for stock_movements and audit_logs

## Overview
Enables RLS on stock_movements and audit_logs. Both org-scoped.

## stock_movements
- SELECT: org-scoped (all users with inventory.view can read)
- INSERT: only via SECURITY DEFINER functions (no direct client inserts)
- No UPDATE/DELETE: movements are immutable

## audit_logs
- SELECT: org-scoped (users with users.manage can read)
- INSERT: org-scoped (any authenticated user in the org)
- No UPDATE/DELETE: audit logs are immutable
*/

-- ============================================================
-- STOCK_MOVEMENTS
-- ============================================================
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sm_select_own" ON stock_movements;
CREATE POLICY "sm_select_own" ON stock_movements FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id());

-- No INSERT/UPDATE/DELETE policies — movements are created only via
-- SECURITY DEFINER functions which bypass RLS.

-- ============================================================
-- AUDIT_LOGS
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "al_select_own" ON audit_logs;
CREATE POLICY "al_select_own" ON audit_logs FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "al_insert_own" ON audit_logs;
CREATE POLICY "al_insert_own" ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_org_id());