-- 1. A coach can already UPDATE any column of their own appointments
--    (appointments_own is FOR ALL), but has no way to add/remove
--    participants — appointment_participants only allows admin writes
--    (appointments.manage permission) or self-read. Lets a coach manage
--    participants of appointments where they're the coach.
CREATE POLICY "appointment_participants_coach_own" ON public.appointment_participants
  FOR ALL
  USING (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id AND a.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id AND a.coach_id = auth.uid()
    )
  );

-- 2. list_appointments: a coach's calendar only ever returned their own
-- appointments, with no way to see that a room/time slot is already taken
-- by another coach. Adds an opt-in p_include_other_coaches flag (the
-- coach calendar view passes it; the plain list view doesn't, so its
-- behavior is unchanged) that also returns other coaches' appointments
-- in the same tenant, with client-identifying fields (title, description,
-- location, meeting_url, client, participants) blanked out — enough to
-- show a dimmed "busy" block for scheduling context, without exposing
-- another coach's client details. is_own tells the caller which rows are
-- theirs vs. just-for-context.

DROP FUNCTION IF EXISTS public.list_appointments CASCADE;
CREATE OR REPLACE FUNCTION public.list_appointments(
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time   TIMESTAMPTZ DEFAULT NULL,
  p_include_other_coaches BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id                UUID,
  title             TEXT,
  description       TEXT,
  start_time        TIMESTAMPTZ,
  end_time          TIMESTAMPTZ,
  status            TEXT,
  appointment_type  TEXT,
  location          TEXT,
  meeting_url       TEXT,
  group_mode        TEXT,
  coach_id          UUID,
  coach_name        TEXT,
  client_id         UUID,
  client_name       TEXT,
  client_avatar     TEXT,
  branch_id         UUID,
  class_template_id UUID,
  max_participants  INT,
  series_id         UUID,
  participants      JSONB,
  is_own            BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_is_admin  BOOLEAN;
BEGIN
  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant no encontrado para el usuario %', auth.uid();
  END IF;

  v_is_admin := public.is_platform_admin() OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles ro ON ro.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = v_tenant_id
      AND ro.name = ANY (ARRAY['admin', 'full_access'])
  );

  RETURN QUERY
  WITH base AS (
    SELECT
      a.id,
      a.title,
      a.description,
      a.start_time,
      a.end_time,
      a.status,
      a.appointment_type,
      a.location,
      a.meeting_url,
      COALESCE(a.group_mode, 'individual') AS group_mode,
      a.coach_id,
      coach_p.full_name    AS coach_name,
      a.client_id,
      client_p.full_name   AS client_name,
      client_p.avatar_url  AS client_avatar,
      a.branch_id,
      a.class_template_id,
      a.max_participants,
      a.series_id,
      (
        v_is_admin
        OR a.coach_id = auth.uid()
        OR a.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.appointment_participants ap
          WHERE ap.appointment_id = a.id AND ap.user_id = auth.uid()
        )
      ) AS is_own
    FROM public.appointments a
    LEFT JOIN public.profiles coach_p  ON coach_p.id  = a.coach_id
    LEFT JOIN public.profiles client_p ON client_p.id = a.client_id
    WHERE a.tenant_id = v_tenant_id
      AND (
        v_is_admin
        OR a.coach_id = auth.uid()
        OR a.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.appointment_participants ap
          WHERE ap.appointment_id = a.id AND ap.user_id = auth.uid()
        )
        OR (p_include_other_coaches AND a.coach_id IS NOT NULL AND a.coach_id <> auth.uid())
      )
      AND (p_start_time IS NULL OR a.start_time >= p_start_time)
      AND (p_end_time   IS NULL OR a.start_time <  p_end_time)
  )
  SELECT
    b.id,
    CASE WHEN b.is_own THEN b.title       ELSE 'Ocupado' END,
    CASE WHEN b.is_own THEN b.description ELSE NULL END,
    b.start_time,
    b.end_time,
    b.status::TEXT,
    b.appointment_type,
    CASE WHEN b.is_own THEN b.location    ELSE NULL END,
    CASE WHEN b.is_own THEN b.meeting_url ELSE NULL END,
    b.group_mode,
    b.coach_id,
    b.coach_name,
    CASE WHEN b.is_own THEN b.client_id      ELSE NULL END,
    CASE WHEN b.is_own THEN b.client_name    ELSE NULL END,
    CASE WHEN b.is_own THEN b.client_avatar  ELSE NULL END,
    b.branch_id,
    b.class_template_id,
    b.max_participants,
    b.series_id,
    CASE WHEN b.is_own THEN COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',         pp.id,
          'full_name',  pp.full_name,
          'avatar_url', pp.avatar_url,
          'status',     ap.status,
          'participant_id', ap.id
        )
        ORDER BY pp.full_name
      )
      FROM public.appointment_participants ap
      JOIN public.profiles pp ON pp.id = ap.user_id
      WHERE ap.appointment_id = b.id
    ), '[]'::JSONB) ELSE '[]'::JSONB END AS participants,
    b.is_own
  FROM base b
  ORDER BY b.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) FROM anon;
