-- user_roles RLS policies still called the throwing get_tenant_id(), unlike
-- branches/tenants (000126/000144) which were switched to
-- get_tenant_id_or_null() specifically so anon-role queries don't blow up.
--
-- branches_admin_all's USING clause is
--   (tenant_id = get_tenant_id_or_null()) AND EXISTS (SELECT ... FROM user_roles ur ...)
-- For an anon caller, get_tenant_id_or_null() is NULL, so the left side of
-- the AND is NULL — but SQL's three-valued AND does NOT short-circuit on a
-- NULL left operand (only a FALSE one), so Postgres still evaluates the
-- EXISTS subquery. That subquery runs against user_roles under RLS, which
-- called the throwing get_tenant_id(), raising "caller must be
-- authenticated" and breaking every anon SELECT on public.branches —
-- including the anonymous branch-listing query the registration page
-- depends on (register/[slug]/page.tsx), which silently fell back to
-- picking an arbitrary "single active tenant" instead of the one the user
-- actually chose.

DROP POLICY IF EXISTS "user_roles_tenant_isolation" ON public.user_roles;
CREATE POLICY "user_roles_tenant_isolation" ON public.user_roles
  FOR SELECT USING (tenant_id = public.get_tenant_id_or_null() OR user_id = auth.uid());

DROP POLICY IF EXISTS "user_roles_admin_write" ON public.user_roles;
CREATE POLICY "user_roles_admin_write" ON public.user_roles
  FOR ALL USING (
    tenant_id = public.get_tenant_id_or_null()
    AND public.has_permission('tenant.manage_roles')
  );
