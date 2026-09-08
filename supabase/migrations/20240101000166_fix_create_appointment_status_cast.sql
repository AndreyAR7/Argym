-- create_appointment (000050) declares p_status as TEXT and inserts it
-- directly into appointments.status, which is the appointment_status enum.
-- Postgres only auto-coerces an untyped string literal ('scheduled' written
-- directly in SQL) to an enum column — a value that already arrived as a
-- TEXT parameter is never implicitly cast, so every call failed with
-- "column "status" is of type appointment_status but expression is of type
-- text".

CREATE OR REPLACE FUNCTION public.create_appointment(
  p_title            TEXT,
  p_client_id        UUID,
  p_coach_id         UUID,
  p_start_time       TIMESTAMPTZ,
  p_end_time         TIMESTAMPTZ,
  p_status           TEXT,
  p_appointment_type TEXT,
  p_location         TEXT,
  p_meeting_url      TEXT,
  p_description      TEXT,
  p_group_mode       TEXT    DEFAULT 'individual',
  p_participant_ids  UUID[]  DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_new_id    UUID;
  v_pid       UUID;
  v_mode      TEXT;
BEGIN
  -- Resolve caller's tenant
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant no encontrado para el usuario %', auth.uid();
  END IF;

  -- Verify primary client belongs to same tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_client_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'El cliente no pertenece a este tenant';
  END IF;

  -- Verify coach belongs to same tenant (if provided)
  IF p_coach_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_coach_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'El coach no pertenece a este tenant';
  END IF;

  -- Auto-detect group mode from participant count
  v_mode := CASE
    WHEN p_participant_ids IS NOT NULL AND array_length(p_participant_ids, 1) > 1 THEN 'group'
    ELSE COALESCE(p_group_mode, 'individual')
  END;

  INSERT INTO public.appointments (
    tenant_id, client_id, coach_id, title, description,
    start_time, end_time, status, appointment_type,
    location, meeting_url, group_mode
  ) VALUES (
    v_tenant_id, p_client_id, p_coach_id, p_title, p_description,
    p_start_time, p_end_time, p_status::appointment_status, p_appointment_type,
    p_location, p_meeting_url, v_mode
  )
  RETURNING id INTO v_new_id;

  -- Insert participants (all provided client IDs)
  IF p_participant_ids IS NOT NULL THEN
    FOREACH v_pid IN ARRAY p_participant_ids LOOP
      -- Skip if profile doesn't belong to tenant (safety check)
      IF EXISTS (
        SELECT 1 FROM public.profiles WHERE id = v_pid AND tenant_id = v_tenant_id
      ) THEN
        INSERT INTO public.appointment_participants (appointment_id, user_id, tenant_id)
        VALUES (v_new_id, v_pid, v_tenant_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_new_id;
END;
$$;
