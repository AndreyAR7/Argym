-- Fix: check that UPDATE actually affected a row to prevent silent failures
CREATE OR REPLACE FUNCTION update_profile_by_staff(
  p_target_user_id  UUID,
  p_full_name       TEXT        DEFAULT NULL,
  p_phone           TEXT        DEFAULT NULL,
  p_date_of_birth   TEXT        DEFAULT NULL,
  p_client_level    TEXT        DEFAULT NULL,
  p_is_active       BOOLEAN     DEFAULT NULL
)
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_tenant UUID;
  v_target_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_caller_tenant
  FROM profiles WHERE id = auth.uid();

  IF v_caller_tenant IS NULL THEN
    RAISE EXCEPTION 'Caller profile not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = v_caller_tenant
      AND r.name IN ('admin', 'coach')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not staff';
  END IF;

  SELECT tenant_id INTO v_target_tenant
  FROM profiles WHERE id = p_target_user_id;

  IF v_target_tenant IS NULL OR v_target_tenant <> v_caller_tenant THEN
    RAISE EXCEPTION 'Unauthorized: target user not in same tenant';
  END IF;

  IF p_client_level IS NOT NULL AND p_client_level NOT IN ('beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'Invalid client_level: must be beginner, intermediate, or advanced';
  END IF;

  UPDATE profiles SET
    full_name     = COALESCE(p_full_name,           full_name),
    phone         = COALESCE(p_phone,               phone),
    date_of_birth = COALESCE(p_date_of_birth::date, date_of_birth),
    client_level  = CASE WHEN p_client_level IS NOT NULL THEN p_client_level ELSE client_level END,
    is_active     = COALESCE(p_is_active,           is_active),
    updated_at    = now()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or update failed';
  END IF;

  RETURN QUERY SELECT * FROM profiles WHERE id = p_target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_profile_by_staff TO authenticated;
