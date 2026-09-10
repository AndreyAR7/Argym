-- ============================================================
-- Client web's "Mis Citas" page queried .from('appointments').eq('client_id',
-- user.id) only — a client invited to a group "clase" as a mere
-- appointment_participants row (not the primary client_id) never showed
-- up there at all, even though they now correctly get a push notification
-- (20240101000196) and correctly show up in admin/coach guest tables
-- (via list_appointments). Fixing the client page to use list_appointments
-- too, which already scopes correctly via participant match — it just
-- never exposed the two columns that page actually needs:
--   - notes: a real, separate column from description (client_appointments
--     used it for a client-authored note shown when there's no
--     cancellation_reason); list_appointments never selected it.
--   - my_participant_status: so the UI can tell "I'm a participant, not
--     the primary client" and show my own confirm/cancel status instead
--     of wrongly offering to confirm/decline the whole class.
-- ============================================================
DROP FUNCTION IF EXISTS public.list_appointments CASCADE;
CREATE OR REPLACE FUNCTION public.list_appointments(
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time   TIMESTAMPTZ DEFAULT NULL,
  p_include_other_coaches BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id                    UUID,
  title                 TEXT,
  description           TEXT,
  notes                 TEXT,
  start_time            TIMESTAMPTZ,
  end_time              TIMESTAMPTZ,
  status                TEXT,
  appointment_type      TEXT,
  location              TEXT,
  meeting_url           TEXT,
  group_mode            TEXT,
  coach_id              UUID,
  coach_name            TEXT,
  client_id             UUID,
  client_name           TEXT,
  client_avatar         TEXT,
  branch_id             UUID,
  class_template_id     UUID,
  max_participants      INT,
  series_id             UUID,
  participants          JSONB,
  is_own                BOOLEAN,
  cancellation_reason   TEXT,
  my_participant_status TEXT
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
      a.notes,
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
      a.cancellation_reason,
      (
        SELECT ap.status FROM public.appointment_participants ap
        WHERE ap.appointment_id = a.id AND ap.user_id = auth.uid()
      ) AS my_participant_status,
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
    CASE WHEN b.is_own THEN b.notes       ELSE NULL END,
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
    b.is_own,
    CASE WHEN b.is_own THEN b.cancellation_reason ELSE NULL END,
    b.my_participant_status
  FROM base b
  ORDER BY b.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) FROM anon;
