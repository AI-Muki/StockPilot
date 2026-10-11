/*
# Fix SECURITY DEFINER function execute permissions

## Problem
The Phase 3 SECURITY DEFINER functions (process_inventory_movement, reserve_stock,
release_reserved_stock) were executable by the `anon` role. Since StockPilot requires
authentication, only `authenticated` users should be able to call these functions.

## Changes
1. Revoke EXECUTE on all three functions from PUBLIC and anon
2. Grant EXECUTE only to authenticated role

## Security Impact
- Unauthenticated users can no longer call inventory movement functions
- Authenticated users retain full access
- Functions remain SECURITY DEFINER with SET search_path = public
*/

REVOKE EXECUTE ON FUNCTION process_inventory_movement FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION process_inventory_movement FROM anon;
GRANT EXECUTE ON FUNCTION process_inventory_movement TO authenticated;

REVOKE EXECUTE ON FUNCTION reserve_stock FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reserve_stock FROM anon;
GRANT EXECUTE ON FUNCTION reserve_stock TO authenticated;

REVOKE EXECUTE ON FUNCTION release_reserved_stock FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION release_reserved_stock FROM anon;
GRANT EXECUTE ON FUNCTION release_reserved_stock TO authenticated;