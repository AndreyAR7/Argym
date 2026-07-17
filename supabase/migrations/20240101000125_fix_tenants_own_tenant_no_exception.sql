-- Confirmed empirically: Postgres does NOT reliably short-circuit
-- `auth.uid() IS NOT NULL AND id = get_tenant_id()` in an RLS USING clause
-- (the previous migration's fix still raised for anon callers). Postgres
-- combines permissive policies with OR, but an exception raised while
-- evaluating ANY one of them still kills the whole query — so
-- tenants_own_tenant calling the hardened, throwing get_tenant_id() broke
-- tenants_public_read_active's anon grant regardless of the guard.
--
-- get_tenant_id() itself must stay throwing (many other tables rely on
-- that hardening). Instead, inline the equivalent lookup here so this one
-- policy never calls it — auth.uid() is NULL for anon, so the subquery
-- just matches zero rows (evaluates to false, no exception).

DROP POLICY IF EXISTS "tenants_own_tenant" ON public.tenants;
CREATE POLICY "tenants_own_tenant" ON public.tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.profiles WHERE profiles.id = auth.uid())
  );
