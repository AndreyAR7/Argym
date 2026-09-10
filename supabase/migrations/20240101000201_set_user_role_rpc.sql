-- ============================================================
-- Generic role switch (client <-> coach <-> admin), for the new "Rol"
-- action on the admin Clientes list. elevate_user_to_coach (000083) and
-- demote_coach_to_client (000103) only ever handled the client<->coach
-- pair — there was no path to promote a client straight to admin.
--
-- Switching a role only touches user_roles + profiles.approval_status —
-- subscriptions, gym_checkins, gamification streaks/XP, routines, etc.
-- all live in separate tables keyed by user_id and are completely
-- untouched by this. A client promoted to admin/coach and later moved
-- back to client keeps their history, their gamification streak, and
-- any plan that hasn't reached its own expiry yet — nothing here
-- cancels or deletes any of it.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_role(
  p_user_id  UUID,
  p_new_role TEXT,   -- 'client' | 'coach' | 'admin'
  p_admin_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id     UUID;
  v_new_role_id   UUID;
  v_admin_role_id UUID;
BEGIN
  IF p_new_role NOT IN ('client', 'coach', 'admin') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = p_admin_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'admin_not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'user_not_in_tenant';
  END IF;

  IF p_user_id = p_admin_id AND p_new_role <> 'admin' THEN
    RAISE EXCEPTION 'cannot_change_own_role';
  END IF;

  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';

  -- Refuse to leave the tenant with zero admins.
  IF p_new_role <> 'admin'
     AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND tenant_id = v_tenant_id AND role_id = v_admin_role_id)
     AND (SELECT COUNT(*) FROM user_roles WHERE tenant_id = v_tenant_id AND role_id = v_admin_role_id) <= 1
  THEN
    RAISE EXCEPTION 'last_admin';
  END IF;

  SELECT id INTO v_new_role_id FROM roles WHERE name = p_new_role;
  IF v_new_role_id IS NULL THEN
    RAISE EXCEPTION 'role_not_found';
  END IF;

  -- client/coach/admin are mutually exclusive primary roles here — drop
  -- whichever of the three this user currently holds before adding the
  -- new one.
  DELETE FROM user_roles
  WHERE user_id   = p_user_id
    AND tenant_id = v_tenant_id
    AND role_id IN (SELECT id FROM roles WHERE name IN ('client', 'coach', 'admin'));

  INSERT INTO user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (p_user_id, v_tenant_id, v_new_role_id, p_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;

  PERFORM set_config('app.bypass_approval_trigger', 'true', true);

  UPDATE profiles
  SET approval_status = 'approved',
      is_active       = TRUE,
      approved_by     = p_admin_id,
      approved_at     = NOW()
  WHERE id = p_user_id AND tenant_id = v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT, UUID) TO authenticated;
