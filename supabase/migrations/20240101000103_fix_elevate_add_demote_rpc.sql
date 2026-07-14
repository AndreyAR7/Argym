-- ============================================================
-- Migration 000103: Fix elevate_user_to_coach + add demote_coach_to_client
--
-- Bug: elevate_user_to_coach updated profiles.approved_at without
-- setting the app.bypass_approval_trigger GUC first, causing the
-- protect_approval_fields trigger to reject it with:
-- "approved_at can only be changed by an administrator"
--
-- Fix: add PERFORM set_config(...) before the UPDATE in both
-- elevate_user_to_coach and the new demote_coach_to_client.
-- ============================================================

-- ── Fix: elevate_user_to_coach ────────────────────────────────
CREATE OR REPLACE FUNCTION public.elevate_user_to_coach(
  p_user_id  UUID,
  p_admin_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id      UUID;
  v_coach_role_id  UUID;
  v_client_role_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = p_admin_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'admin_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'user_not_in_tenant';
  END IF;

  SELECT id INTO v_coach_role_id  FROM roles WHERE name = 'coach';
  SELECT id INTO v_client_role_id FROM roles WHERE name = 'client';

  DELETE FROM user_roles
  WHERE user_id   = p_user_id
    AND tenant_id = v_tenant_id
    AND role_id   = v_client_role_id;

  INSERT INTO user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (p_user_id, v_tenant_id, v_coach_role_id, p_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;

  -- Required: bypass protect_approval_fields trigger before touching approved_at
  PERFORM set_config('app.bypass_approval_trigger', 'true', true);

  UPDATE profiles
  SET
    approval_status = 'approved',
    is_active       = TRUE,
    approved_by     = p_admin_id,
    approved_at     = NOW()
  WHERE id = p_user_id AND tenant_id = v_tenant_id;
END;
$$;

-- ── New: demote_coach_to_client ───────────────────────────────
CREATE OR REPLACE FUNCTION public.demote_coach_to_client(
  p_user_id  UUID,
  p_admin_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id      UUID;
  v_coach_role_id  UUID;
  v_client_role_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = p_admin_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'admin_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'user_not_in_tenant';
  END IF;

  SELECT id INTO v_coach_role_id  FROM roles WHERE name = 'coach';
  SELECT id INTO v_client_role_id FROM roles WHERE name = 'client';

  DELETE FROM user_roles
  WHERE user_id   = p_user_id
    AND tenant_id = v_tenant_id
    AND role_id   = v_coach_role_id;

  INSERT INTO user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (p_user_id, v_tenant_id, v_client_role_id, p_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;

  PERFORM set_config('app.bypass_approval_trigger', 'true', true);

  UPDATE profiles
  SET
    approval_status = 'approved',
    is_active       = TRUE,
    approved_by     = p_admin_id,
    approved_at     = NOW()
  WHERE id = p_user_id AND tenant_id = v_tenant_id;
END;
$$;
