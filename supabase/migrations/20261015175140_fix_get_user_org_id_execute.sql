/*
# Fix: Grant EXECUTE on get_user_org_id() to authenticated

The profiles RLS policy now calls get_user_org_id() to avoid infinite recursion.
But EXECUTE was revoked from authenticated in an earlier migration.
RLS policy evaluation runs with the caller's permissions, so authenticated
needs EXECUTE on this function for the policy to work.

We keep the revoke from anon since anon users don't need it.
*/

GRANT EXECUTE ON FUNCTION get_user_org_id() TO authenticated;