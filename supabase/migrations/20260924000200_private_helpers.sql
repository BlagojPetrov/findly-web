-- P2.S2: move the RLS helper functions out of the API.
--
-- Functions in "public" are callable through the Data API (/rest/v1/rpc/...).
-- is_admin() and can_write() exist only for RLS policies, so they live in a
-- "private" schema that the API does not expose. Policies reference functions
-- by OID, so existing policies keep working after the move. anon and
-- authenticated still need USAGE/EXECUTE because policies run as the caller.
--
-- current_profile() stays in "public" on purpose: the app calls it to read the
-- signed-in user's own role, ban status and language.

create schema private;
grant usage on schema private to anon, authenticated;

alter function public.is_admin() set schema private;
alter function public.can_write() set schema private;
