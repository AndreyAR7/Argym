-- ============================================================
-- Migration 000049: list_appointments RPC
--
-- SECURITY DEFINER so it bypasses RLS (same pattern as
-- get_profiles_by_role). Direct table queries via RLS were
-- silently returning 0 rows because the EXISTS sub-query on
-- user_roles is itself subject to RLS.
-- ============================================================

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
  v_role      TEXT;
BEGIN
  -- Resolve caller's tenant
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant no encontrado para el usuario %', auth.uid();
  END IF;

  -- Resolve caller's role (admin sees all, coach sees own)
  SELECT ro.name INTO v_role
  FROM public.user_roles ur
  JOIN public.roles ro ON ro.id = ur.role_id
  WHERE ur.user_id  = auth.uid()
    AND ur.tenant_id = v_tenant_id
  ORDER BY CASE ro.name WHEN 'admin' THEN 0 WHEN 'coach' THEN 1 ELSE 2 END
  LIMIT 1;

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
    ), '[]'::JSONB)          AS participants
  FROM public.appointments a
  LEFT JOIN public.profiles coach_p  ON coach_p.id  = a.coach_id
  LEFT JOIN public.profiles client_p ON client_p.id = a.client_id
  WHERE a.tenant_id = v_tenant_id
    -- Coaches only see their own appointments
    AND (v_role = 'admin' OR a.coach_id = auth.uid() OR a.client_id = auth.uid())
    AND (p_start_time IS NULL OR a.start_time >= p_start_time)
    AND (p_end_time   IS NULL OR a.start_time <  p_end_time)
  ORDER BY a.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;
