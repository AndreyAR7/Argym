-- list_appointments (000162) computes v_is_admin by checking user_roles for
-- a per-tenant 'admin' row — but a platform admin (public.is_platform_admin(),
-- 000116) manages tenants without ever holding a tenant-scoped 'admin' role
-- row there; they just point their own profiles.tenant_id at whichever
-- tenant they're viewing (switch_platform_admin_tenant, 000122). Every
-- other admin-gate in this codebase (has_permission()) already treats
-- is_platform_admin() as an automatic pass; list_appointments never did,
-- so a platform admin's own tenant_id filter matched fine but v_is_admin
-- was false, and unless they happened to literally be the appointment's
-- coach/client/participant, the appointment was invisible — in both the
-- list and the calendar, since both read from this same RPC.

CREATE OR REPLACE FUNCTION public.list_appointments(
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time   TIMESTAMPTZ DEFAULT NULL
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
  participants      JSONB
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
      AND ro.name = 'admin'
  );

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
    a.branch_id,
    a.class_template_id,
    a.max_participants,
    COALESCE((
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
      WHERE ap.appointment_id = a.id
    ), '[]'::JSONB) AS participants
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
    )
    AND (p_start_time IS NULL OR a.start_time >= p_start_time)
    AND (p_end_time   IS NULL OR a.start_time <  p_end_time)
  ORDER BY a.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;
