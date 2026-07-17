-- profiles_tenant_isolation (on profiles itself) ALSO calls the throwing
-- get_tenant_id(), so the previous migration's subquery into profiles
-- still hit the same exception one level deeper — RLS applies recursively
-- to any query against a protected table, even from inside another
-- table's policy expression. A SECURITY DEFINER function bypasses RLS
-- for its own internal query (same reason get_tenant_id() itself works),
-- so a dedicated non-throwing variant sidesteps profiles' RLS entirely
-- instead of running as the calling (possibly anonymous) role.

CREATE OR REPLACE FUNCTION public.get_tenant_id_or_null()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_tenant_id_or_null() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_id_or_null() TO authenticated, anon;

DROP POLICY IF EXISTS "tenants_own_tenant" ON public.tenants;
CREATE POLICY "tenants_own_tenant" ON public.tenants
  FOR SELECT USING (id = public.get_tenant_id_or_null());
