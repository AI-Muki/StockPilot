/*
# Fix SECURITY DEFINER function permissions

## Overview
The security advisor flagged that several SECURITY DEFINER functions are callable
by the anon and authenticated roles via the REST API. These functions are internal
helpers used by RLS policies and triggers — they should NOT be directly callable
by clients. This migration revokes EXECUTE from anon and authenticated roles.

## Changes
1. `get_user_org_id()` — revoke EXECUTE from anon, authenticated
2. `has_permission(text)` — revoke EXECUTE from anon, authenticated
3. `handle_new_user()` — revoke EXECUTE from anon, authenticated (trigger function)
4. `update_updated_at()` — add explicit search_path to fix mutable search_path warning
*/

REVOKE EXECUTE ON FUNCTION get_user_org_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION has_permission(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon, authenticated;

-- Fix mutable search_path on update_updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;