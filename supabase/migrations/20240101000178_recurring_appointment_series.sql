-- 1:1 appointments had no concept of "every week at this time" — booking
-- a standing weekly session meant re-creating it by hand every time.
-- Adds a series_id shared by every occurrence created together in one
-- batch (no new cron/template machinery — class_templates already covers
-- the recurring-with-a-schedule-engine case; 1:1s just need N rows that
-- know they belong together for "cancel this one vs. all future ones").

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS series_id UUID;

CREATE INDEX IF NOT EXISTS idx_appointments_series ON public.appointments(series_id) WHERE series_id IS NOT NULL;

-- Adding a parameter changes the function's identity (types+order) even
-- with a default — drop the old 12-arg signature explicitly so PostgREST
-- never has two ambiguous overloads to choose between.
DROP FUNCTION IF EXISTS public.create_appointment(
  TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[]
);

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
  p_participant_ids  UUID[]  DEFAULT NULL,
  p_series_id        UUID    DEFAULT NULL
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
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant no encontrado para el usuario %', auth.uid();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_client_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'El cliente no pertenece a este tenant';
  END IF;

  IF p_coach_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_coach_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'El coach no pertenece a este tenant';
  END IF;

  v_mode := CASE
    WHEN p_participant_ids IS NOT NULL AND array_length(p_participant_ids, 1) > 1 THEN 'group'
    ELSE COALESCE(p_group_mode, 'individual')
  END;

  INSERT INTO public.appointments (
    tenant_id, client_id, coach_id, title, description,
    start_time, end_time, status, appointment_type,
    location, meeting_url, group_mode, series_id
  ) VALUES (
    v_tenant_id, p_client_id, p_coach_id, p_title, p_description,
    p_start_time, p_end_time, p_status::appointment_status, p_appointment_type,
    p_location, p_meeting_url, v_mode, p_series_id
  )
  RETURNING id INTO v_new_id;

  IF p_participant_ids IS NOT NULL THEN
    FOREACH v_pid IN ARRAY p_participant_ids LOOP
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

REVOKE ALL ON FUNCTION public.create_appointment(
  TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], UUID
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_appointment(
  TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], UUID
) TO authenticated;
