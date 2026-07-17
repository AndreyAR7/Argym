-- get_tenant_id() now RAISEs for unauthenticated callers (a hardening
-- change made at some point after this policy was written). Postgres
-- evaluates every SELECT policy on a table, and an exception raised while
-- evaluating ANY of them fails the whole query — so an anonymous request
-- to `tenants` failed entirely even though tenants_public_read_active
-- alone would have granted it. Guard the auth.uid()-dependent policy so
-- it doesn't call get_tenant_id() at all for anonymous callers.

DROP POLICY IF EXISTS "tenants_own_tenant" ON public.tenants;
CREATE POLICY "tenants_own_tenant" ON public.tenants
  FOR SELECT USING (auth.uid() IS NOT NULL AND id = public.get_tenant_id());
