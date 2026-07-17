-- Let the platform admin "act as" any tenant's admin by switching their own
-- profiles.tenant_id, instead of building a separate impersonation layer
-- (many write paths across the app read profile.tenant_id directly, not
-- just via RLS — switching the single source of truth keeps all of them
-- correct with no further changes). has_permission() needs a bypass since
-- the platform admin only has a user_roles row for their home tenant.

ALTER TABLE public.platform_admins ADD COLUMN home_tenant_id UUID REFERENCES public.tenants(id);

UPDATE public.platform_admins pa
SET home_tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = pa.user_id)
WHERE pa.home_tenant_id IS NULL;

CREATE OR REPLACE FUNCTION public.has_permission(permission_code text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN FALSE
    WHEN public.is_platform_admin() THEN TRUE
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id   = auth.uid()
        AND ur.tenant_id = public.get_tenant_id()
        AND p.code       = permission_code
    )
  END
$function$;
