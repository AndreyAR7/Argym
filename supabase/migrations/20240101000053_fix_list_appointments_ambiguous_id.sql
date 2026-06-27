-- ============================================================
-- Migration 000053: fix list_appointments ambiguous column 'id'
--
-- Root cause: RETURNS TABLE declares an OUT variable named 'id'.
-- The query "WHERE id = auth.uid()" is ambiguous between that
-- OUT variable and the profiles.id column (PG error 42702).
-- Function always failed at runtime even though it compiled.
--
-- Fix: qualify with table alias "p" → WHERE p.id = auth.uid()
-- ============================================================

DROP FUNCTION IF EXISTS public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.list_appointments(
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  description      TEXT,
  start_time       TIMESTAMPTZ,
  end_time         TIMESTAMPTZ,
  status           TEXT,
  appointment_type TEXT,
  location         TEXT,
  meeting_url      TEXT,
  group_mode       TEXT,
  coach_id         UUID,
  coach_name       TEXT,
  client_id        UUID,
  client_name      TEXT,
  client_avatar    TEXT,
  participants     JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Use alias "p" to avoid ambiguity with the RETURNS TABLE OUT variable "id"
  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant no encontrado para el usuario %', auth.uid();
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.description,
    a.start_time,
    a.end_time,
    a.status::TEXT,
    a.appointment_type,
    a.location,
    a.meeting_url,
    COALESCE(a.group_mode, 'individual'),
    a.coach_id,
    coach_p.full_name       AS coach_name,
    a.client_id,
    client_p.full_name      AS client_name,
    client_p.avatar_url     AS client_avatar,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',         pp.id,
          'full_name',  pp.full_name,
          'avatar_url', pp.avatar_url
        )
        ORDER BY pp.full_name
      )
      FROM public.appointment_participants ap
      JOIN public.profiles pp ON pp.id = ap.user_id
      WHERE ap.appointment_id = a.id
    ), '[]'::JSONB) AS participants
  FROM public.appointments a
  LEFT JOIN public.profiles coach_p  ON coach_p.id  = a.coach_id
  LEFT JOIN public.profiles client_p ON client_p.id = a.client_id
  WHERE a.tenant_id = v_tenant_id
    AND (p_start_time IS NULL OR a.start_time >= p_start_time)
    AND (p_end_time   IS NULL OR a.start_time <  p_end_time)
  ORDER BY a.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;
