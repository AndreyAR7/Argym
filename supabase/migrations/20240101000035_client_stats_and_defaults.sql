  -- ═══════════════════════════════════════════════════════════════
  -- 1. RPC: count only approved+active clients (role='client')
  --    Used by admin dashboard to fix the "clients without plan" metric.
  -- ═══════════════════════════════════════════════════════════════

  CREATE OR REPLACE FUNCTION get_approved_client_count()
  RETURNS integer
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
  AS $$
    SELECT COUNT(DISTINCT p.id)::integer
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r       ON r.id = ur.role_id AND r.name = 'client'
    WHERE p.tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
    AND p.approval_status = 'approved'
    AND p.is_active = TRUE;
  $$;

  GRANT EXECUTE ON FUNCTION get_approved_client_count() TO authenticated;

  -- ═══════════════════════════════════════════════════════════════
  -- 2. Trigger: auto-set client_level = 'beginner' when the
  --    'client' role is assigned to a user for the first time.
  -- ═══════════════════════════════════════════════════════════════

  CREATE OR REPLACE FUNCTION set_default_client_level()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_role_name TEXT;
  BEGIN
    SELECT name INTO v_role_name FROM roles WHERE id = NEW.role_id;

    IF v_role_name = 'client' THEN
      UPDATE profiles
      SET client_level = 'beginner'
      WHERE id = NEW.user_id
        AND client_level IS NULL;
    END IF;

    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS trg_set_default_client_level ON user_roles;
  CREATE TRIGGER trg_set_default_client_level
    AFTER INSERT ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION set_default_client_level();

  -- Back-fill: set beginner for existing approved clients that have no level yet
  UPDATE profiles p
  SET client_level = 'beginner'
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id AND r.name = 'client'
  WHERE ur.user_id = p.id
    AND p.client_level IS NULL
    AND p.approval_status = 'approved';
