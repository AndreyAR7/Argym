-- Missing RLS policies that were not applied to the new Supabase project.
-- These are defined in 20240101000004_rls.sql but were absent in the live DB,
-- causing user_roles queries to return null (RLS deny by default) and
-- routing every authenticated user to /pending-approval.

-- user_roles: allow users to read roles within their tenant
CREATE POLICY IF NOT EXISTS "user_roles_tenant_isolation" ON public.user_roles
  FOR SELECT USING (tenant_id = public.get_tenant_id());

-- user_roles: allow admins to manage role assignments
CREATE POLICY IF NOT EXISTS "user_roles_admin_write" ON public.user_roles
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('tenant.manage_roles')
  );

-- profiles: allow users to read all profiles within their tenant (needed by admins/coaches)
CREATE POLICY IF NOT EXISTS "profiles_tenant_isolation" ON public.profiles
  FOR SELECT USING (tenant_id = public.get_tenant_id());

-- tenants: allow users to read their own tenant record
CREATE POLICY IF NOT EXISTS "tenants_own_tenant" ON public.tenants
  FOR SELECT USING (id = public.get_tenant_id());
