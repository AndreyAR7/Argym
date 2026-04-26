-- The reserved 'role' GUC cannot be set inside SECURITY DEFINER functions.
-- Use a custom app.* namespace GUC which is user-settable from any context.

-- 1. Update the trigger to check the new GUC name
CREATE OR REPLACE FUNCTION public.protect_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_setting('app.bypass_approval_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status   IS DISTINCT FROM OLD.approval_status   THEN
    RAISE EXCEPTION 'approval_status can only be changed by an administrator';
  END IF;
  IF NEW.approved_by       IS DISTINCT FROM OLD.approved_by       THEN
    RAISE EXCEPTION 'approved_by can only be changed by an administrator';
  END IF;
  IF NEW.approved_at       IS DISTINCT FROM OLD.approved_at       THEN
    RAISE EXCEPTION 'approved_at can only be changed by an administrator';
  END IF;
  IF NEW.rejection_reason  IS DISTINCT FROM OLD.rejection_reason  THEN
    RAISE EXCEPTION 'rejection_reason can only be changed by an administrator';
  END IF;
  IF NEW.tenant_id         IS DISTINCT FROM OLD.tenant_id         THEN
    RAISE EXCEPTION 'tenant_id cannot be changed';
  END IF;
  IF NEW.is_active         IS DISTINCT FROM OLD.is_active         THEN
    IF NOT public.has_permission('tenant.manage_users') THEN
      RAISE EXCEPTION 'is_active can only be changed by an administrator';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Update approve_user to use the correct custom GUC
CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id   UUID,
  p_role_name TEXT,
  p_admin_id  UUID
)
RETURNS VOID AS $$
DECLARE
  v_role_id        UUID;
  v_tenant_id      UUID;
  v_admin_tenant   UUID;
  v_current_status TEXT;
BEGIN
  IF NOT public.has_permission('tenant.manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions to approve users';
  END IF;

  SELECT tenant_id INTO v_admin_tenant
    FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_tenant IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found';
  END IF;

  SELECT tenant_id, approval_status
    INTO v_tenant_id, v_current_status
    FROM public.profiles WHERE id = p_user_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_tenant_id <> v_admin_tenant THEN
    RAISE EXCEPTION 'Cannot approve users from a different tenant';
  END IF;

  IF v_current_status = 'approved' THEN
    RAISE EXCEPTION 'User is already approved';
  END IF;

  SELECT id INTO v_role_id FROM public.roles WHERE name = p_role_name;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role "%" not found', p_role_name;
  END IF;

  -- Use app.* custom GUC — settable inside SECURITY DEFINER functions
  PERFORM set_config('app.bypass_approval_trigger', 'true', true);

  UPDATE public.profiles SET
    approval_status  = 'approved',
    is_active        = TRUE,
    approved_by      = p_admin_id,
    approved_at      = NOW(),
    rejection_reason = NULL
  WHERE id = p_user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (p_user_id, v_tenant_id, v_role_id, p_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update reject_user to use the correct custom GUC
CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id  UUID,
  p_reason   TEXT,
  p_admin_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_tenant_id    UUID;
  v_admin_tenant UUID;
BEGIN
  IF NOT public.has_permission('tenant.manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions to reject users';
  END IF;

  SELECT tenant_id INTO v_admin_tenant
    FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_tenant IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found';
  END IF;

  SELECT tenant_id INTO v_tenant_id
    FROM public.profiles WHERE id = p_user_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_tenant_id <> v_admin_tenant THEN
    RAISE EXCEPTION 'Cannot reject users from a different tenant';
  END IF;

  -- Use app.* custom GUC — settable inside SECURITY DEFINER functions
  PERFORM set_config('app.bypass_approval_trigger', 'true', true);

  UPDATE public.profiles SET
    approval_status  = 'rejected',
    is_active        = FALSE,
    approved_by      = p_admin_id,
    approved_at      = NOW(),
    rejection_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Sin motivo especificado')
  WHERE id = p_user_id;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
