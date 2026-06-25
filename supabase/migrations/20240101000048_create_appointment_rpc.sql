-- ============================================================
-- Migration 000048: create_appointment RPC
--
-- Wraps the appointments INSERT in a SECURITY DEFINER function
-- so it runs with elevated privileges, bypassing RLS edge cases.
-- The function still enforces tenant isolation and validates the
-- client/coach belong to the same tenant.
-- ============================================================

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
  p_group_mode       TEXT DEFAULT 'individual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_new_id    UUID;
BEGIN
  -- Resolve caller's tenant
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant no encontrado para el usuario %', auth.uid();
  END IF;

  -- Verify client belongs to same tenant
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

  INSERT INTO public.appointments (
    tenant_id,
    client_id,
    coach_id,
    title,
    description,
    start_time,
    end_time,
    status,
    appointment_type,
    location,
    meeting_url,
    group_mode
  ) VALUES (
    v_tenant_id,
    p_client_id,
    p_coach_id,
    p_title,
    p_description,
    p_start_time,
    p_end_time,
    p_status,
    p_appointment_type,
    p_location,
    p_meeting_url,
    p_group_mode
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_appointment(
  TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_appointment(
  TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM anon;
