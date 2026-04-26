-- Fix approve_user() and reject_user() to bypass the protect_approval_fields trigger.
-- The trigger checks current_setting('role', true) = 'rls_bypasser'.
-- SECURITY DEFINER alone does NOT bypass triggers — we must set the GUC manually.

CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id  UUID,
  p_role_name TEXT,
  p_admin_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_role_id      UUID;
  v_tenant_id    UUID;
  v_admin_tenant UUID;
  v_current_status TEXT;
BEGIN
  -- Permission check
  IF NOT public.has_permission('tenant.manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions to approve users';
  END IF;

  -- Resolve admin tenant
  SELECT tenant_id INTO v_admin_tenant
    FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_tenant IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found';
  END IF;

  -- Resolve target user
  SELECT tenant_id, approval_status
    INTO v_tenant_id, v_current_status
    FROM public.profiles WHERE id = p_user_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Tenant isolation
  IF v_tenant_id <> v_admin_tenant THEN
    RAISE EXCEPTION 'Cannot approve users from a different tenant';
  END IF;

  -- Idempotency guard
  IF v_current_status = 'approved' THEN
    RAISE EXCEPTION 'User is already approved';
  END IF;

  -- Resolve role
  SELECT id INTO v_role_id FROM public.roles WHERE name = p_role_name;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role "%" not found', p_role_name;
  END IF;

  -- Allow protect_approval_fields trigger to pass for this transaction
  PERFORM set_config('role', 'rls_bypasser', true);

  -- Atomic update
  UPDATE public.profiles SET
    approval_status  = 'approved',
    is_active        = TRUE,
    approved_by      = p_admin_id,
    approved_at      = NOW(),
    rejection_reason = NULL
  WHERE id = p_user_id;

  -- Assign role
  INSERT INTO public.user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (p_user_id, v_tenant_id, v_role_id, p_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


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
  -- Permission check
  IF NOT public.has_permission('tenant.manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions to reject users';
  END IF;

  -- Resolve admin tenant
  SELECT tenant_id INTO v_admin_tenant
    FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_tenant IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found';
  END IF;

  -- Resolve target user
  SELECT tenant_id INTO v_tenant_id
    FROM public.profiles WHERE id = p_user_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Tenant isolation
  IF v_tenant_id <> v_admin_tenant THEN
    RAISE EXCEPTION 'Cannot reject users from a different tenant';
  END IF;

  -- Allow protect_approval_fields trigger to pass for this transaction
  PERFORM set_config('role', 'rls_bypasser', true);

  -- Atomic update
  UPDATE public.profiles SET
    approval_status  = 'rejected',
    is_active        = FALSE,
    approved_by      = p_admin_id,
    approved_at      = NOW(),
    rejection_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Sin motivo especificado')
  WHERE id = p_user_id;

  -- Remove assigned roles
  DELETE FROM public.user_roles
  WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
