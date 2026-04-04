-- ============================================================
-- Helper Functions (public schema — auth schema is read-only in Supabase cloud)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = public.get_tenant_id()
      AND p.code = permission_code
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- subscription_plans
-- ============================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plans_public_read" ON public.subscription_plans
  FOR SELECT USING (is_active = TRUE);

-- ============================================================
-- tenants
-- ============================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_own_tenant" ON public.tenants
  FOR SELECT USING (id = public.get_tenant_id());

-- ============================================================
-- tenant_subscriptions
-- ============================================================

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_subscriptions_isolation" ON public.tenant_subscriptions
  FOR SELECT USING (tenant_id = public.get_tenant_id());

-- ============================================================
-- tenant_modules
-- ============================================================

ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_modules_read" ON public.tenant_modules
  FOR SELECT USING (tenant_id = public.get_tenant_id());

CREATE POLICY "tenant_modules_admin_write" ON public.tenant_modules
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('tenant.manage_modules')
  );

-- ============================================================
-- profiles
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_tenant_isolation" ON public.profiles
  FOR SELECT USING (tenant_id = public.get_tenant_id());

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_admin_write" ON public.profiles
  FOR INSERT WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('tenant.manage_users')
  );

-- ============================================================
-- roles
-- ============================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_authenticated_read" ON public.roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- user_roles
-- ============================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_tenant_isolation" ON public.user_roles
  FOR SELECT USING (tenant_id = public.get_tenant_id());

CREATE POLICY "user_roles_admin_write" ON public.user_roles
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('tenant.manage_roles')
  );

-- ============================================================
-- permissions
-- ============================================================

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_authenticated_read" ON public.permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- role_permissions
-- ============================================================

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_authenticated_read" ON public.role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- device_tokens
-- ============================================================

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_tokens_own" ON public.device_tokens
  FOR ALL USING (user_id = auth.uid());
