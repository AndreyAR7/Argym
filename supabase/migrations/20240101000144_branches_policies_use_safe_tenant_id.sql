-- ============================================================
-- Migration 000144: branches RLS policies still call the
-- throwing get_tenant_id()
--
-- get_tenant_id() (migration 000078) RAISE EXCEPTIONs when auth.uid()
-- is NULL — deliberately, so a bug that forgets to check auth doesn't
-- silently leak cross-tenant data. get_tenant_id_or_null() (migration
-- 000126) exists specifically for policies that must also be
-- evaluated for anon/unauthenticated roles, where NULL should just
-- mean "doesn't match" instead of blowing up the whole query.
--
-- branches_admin_all (000047:34-58) has no `TO authenticated` clause,
-- so Postgres evaluates its USING clause for anon SELECTs too — and
-- since RLS policies are evaluated (not short-circuited away) even
-- when another permissive policy would already grant access, calling
-- the throwing get_tenant_id() here breaks the anon registration
-- branch-selector query (branches_anon_read exists for exactly that
-- read, but never gets a chance to be the one that matters once
-- get_tenant_id() has already thrown). branches_auth_read is scoped
-- `TO authenticated`, but is switched too for the same defensive
-- reason get_tenant_id_or_null() exists in the first place.
-- ============================================================

DROP POLICY IF EXISTS "branches_admin_all" ON public.branches;
CREATE POLICY "branches_admin_all" ON public.branches
  FOR ALL
  USING (
    tenant_id = public.get_tenant_id_or_null()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles ro ON ro.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.get_tenant_id_or_null()
        AND ro.name = 'admin'
    )
  )
  WITH CHECK (
    tenant_id = public.get_tenant_id_or_null()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles ro ON ro.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.get_tenant_id_or_null()
        AND ro.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "branches_auth_read" ON public.branches;
CREATE POLICY "branches_auth_read" ON public.branches
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id_or_null());
