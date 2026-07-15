-- Missing RLS policies that were not applied to the new Supabase project.
-- These are defined in 20240101000004_rls.sql but were absent in the live DB,
-- causing user_roles queries to return null (RLS deny by default) and
-- routing every authenticated user to /pending-approval.
--
-- NOTE: originally written with `CREATE POLICY IF NOT EXISTS`, which is not
-- valid PostgreSQL syntax (policies don't support IF NOT EXISTS) — this file
-- had never successfully applied anywhere. Fixed to use the same
-- check-then-create DO block pattern as migrations 000108/000109.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_roles' AND policyname='user_roles_tenant_isolation') THEN
    EXECUTE $p$
      CREATE POLICY "user_roles_tenant_isolation" ON public.user_roles
        FOR SELECT USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_roles' AND policyname='user_roles_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "user_roles_admin_write" ON public.user_roles
        FOR ALL USING (
          tenant_id = public.get_tenant_id()
          AND public.has_permission('tenant.manage_roles')
        )
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_tenant_isolation') THEN
    EXECUTE $p$
      CREATE POLICY "profiles_tenant_isolation" ON public.profiles
        FOR SELECT USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenants_own_tenant') THEN
    EXECUTE $p$
      CREATE POLICY "tenants_own_tenant" ON public.tenants
        FOR SELECT USING (id = public.get_tenant_id())
    $p$;
  END IF;
END $$;
