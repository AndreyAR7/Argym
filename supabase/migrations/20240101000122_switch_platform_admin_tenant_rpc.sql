-- profiles.tenant_id is hard-locked by trg_protect_approval_fields
-- (protect_approval_fields() raises on any tenant_id change, even via the
-- service-role client — triggers fire regardless of RLS bypass). This RPC
-- uses that trigger's own escape hatch (app.bypass_approval_trigger) to
-- let a verified platform admin switch which tenant their own profile
-- points to, atomically within one function call.

CREATE OR REPLACE FUNCTION public.switch_platform_admin_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_active BOOLEAN;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can switch tenants';
  END IF;

  SELECT is_active INTO v_is_active FROM public.tenants WHERE id = p_tenant_id;
  IF v_is_active IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  PERFORM set_config('app.bypass_approval_trigger', 'true', true);
  UPDATE public.profiles SET tenant_id = p_tenant_id WHERE id = auth.uid();

  RETURN v_is_active;
END;
$$;

REVOKE ALL ON FUNCTION public.switch_platform_admin_tenant(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_platform_admin_tenant(UUID) TO authenticated;
