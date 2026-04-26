-- ============================================================
-- RPC: create_notifications_for_users
-- SECURITY DEFINER — bypasses RLS for insert
-- Only callable by authenticated admins of the target tenant
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_notifications_for_users(
  p_tenant_id UUID,
  p_rows      JSONB   -- array of notification objects
)
RETURNS INTEGER AS $$
DECLARE
  v_caller_id  UUID;
  v_is_admin   BOOLEAN;
  v_row        JSONB;
  v_user_id    UUID;
  v_count      INTEGER := 0;
BEGIN
  -- 1. Get the calling user
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify caller is admin in the target tenant
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles ro ON ro.id = ur.role_id
    WHERE ur.user_id = v_caller_id
      AND ur.tenant_id = p_tenant_id
      AND ro.name = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Caller is not an admin in tenant %', p_tenant_id;
  END IF;

  -- 3. Insert each notification row
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_user_id := (v_row->>'user_id')::UUID;

    -- Verify destination user belongs to the same tenant
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_user_id AND tenant_id = p_tenant_id
    ) THEN
      RAISE WARNING 'Skipping user_id % — not in tenant %', v_user_id, p_tenant_id;
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (
      user_id,
      tenant_id,
      type,
      title,
      message,
      related_entity_type,
      related_entity_id
    ) VALUES (
      v_user_id,
      p_tenant_id,
      (v_row->>'type')::TEXT,
      (v_row->>'title')::TEXT,
      (v_row->>'message')::TEXT,
      (v_row->>'related_entity_type')::TEXT,
      CASE
        WHEN v_row->>'related_entity_id' IS NOT NULL
        THEN (v_row->>'related_entity_id')::UUID
        ELSE NULL
      END
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_notifications_for_users(UUID, JSONB) TO authenticated;
