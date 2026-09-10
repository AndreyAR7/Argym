-- Group appointments/classes created with pre-picked invitees
-- (AppointmentFormModal's multi-client selector -> create_appointment's
-- p_participant_ids) inserted rows into appointment_participants but never
-- notified anyone in it. The two existing appointment-created triggers
-- (trigger_appointment_communication for email, trg_notify_push_appointment_created
-- for push — see 20240101000111 and 20240101000104) both key off
-- appointments.client_id only, so only the FIRST selected client (who
-- becomes appointments.client_id) ever heard anything; every other invitee
-- — the entire point of "invite these specific people to this class" —
-- got silently nothing. Confirmed: no trigger of any kind exists on
-- appointment_participants at all.
--
-- Fixes this at the source (create_appointment itself) rather than adding
-- a table trigger, since a trigger can't distinguish "invited at creation"
-- from "self-enrolled via request_class_spot" (which intentionally has no
-- invitation to send — the person chose to join). Self-enrollment/
-- confirm/cancel notifications remain a separate, not-yet-built feature.

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
  v_inserted  BOOLEAN;
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
        ON CONFLICT DO NOTHING
        RETURNING TRUE INTO v_inserted;

        -- appointments.client_id (the first pick) already gets an
        -- appointment.created email/push via the existing insert triggers —
        -- only notify the *other* invitees here, and only the ones actually
        -- newly added (ON CONFLICT DO NOTHING left v_inserted NULL otherwise).
        IF v_inserted AND v_pid != p_client_id THEN
          PERFORM public.queue_notification(
            v_pid, v_tenant_id, 'appointment_created', 'push', 'appointment',
            'Nueva cita/clase',
            'Fuiste invitado a "' || p_title || '".',
            jsonb_build_object('appointment_id', v_new_id, 'title', p_title, 'start_time', p_start_time)
          );
        END IF;
        v_inserted := NULL;
      END IF;
    END LOOP;
  END IF;

  RETURN v_new_id;
END;
$$;
