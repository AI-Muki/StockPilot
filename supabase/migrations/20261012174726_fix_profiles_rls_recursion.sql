/*
# Fix: Infinite recursion in profiles RLS policy

The profiles SELECT policy used a subquery:
  organization_id = (SELECT organization_id FROM profiles p WHERE p.id = auth.uid())
This queries profiles from within profiles' own RLS policy → infinite recursion.

Fix: use get_user_org_id() instead, which is SECURITY DEFINER and bypasses RLS.
*/

DROP POLICY IF EXISTS "profile_select_own" ON profiles;
CREATE POLICY "profile_select_own" ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR organization_id = get_user_org_id()
  );