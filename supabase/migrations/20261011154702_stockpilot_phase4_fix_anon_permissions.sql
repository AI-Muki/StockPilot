/*
# Fix: Revoke anon execute on Phase 4 SECURITY DEFINER functions

The `anon` role retained execute access on generate_po_number and
receive_purchase_order_item despite the REVOKE FROM PUBLIC in the schema migration.
Explicitly revoke from anon to ensure only authenticated users can call them.
*/

REVOKE EXECUTE ON FUNCTION generate_po_number(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION receive_purchase_order_item(uuid, uuid, integer, uuid) FROM anon;