-- Elevates an existing client to the coach role within the same tenant.
-- Removes the client role and assigns the coach role atomically.
CREATE OR REPLACE FUNCTION elevate_user_to_coach(
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

  -- Remove client role if it exists
  DELETE FROM user_roles
  WHERE user_id  = p_user_id
    AND tenant_id = v_tenant_id
    AND role_id   = v_client_role_id;

  -- Assign coach role (idempotent)
  INSERT INTO user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (p_user_id, v_tenant_id, v_coach_role_id, p_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;

  -- Ensure profile is approved and active
  UPDATE profiles
  SET
    approval_status = 'approved',
    is_active       = TRUE,
    approved_by     = p_admin_id,
    approved_at     = NOW()
  WHERE id = p_user_id AND tenant_id = v_tenant_id;
END;
$$;
