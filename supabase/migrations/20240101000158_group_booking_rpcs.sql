-- Atomic booking for group classes: locks the appointment row so concurrent
-- requests can't both slip past the capacity check (same SECURITY DEFINER +
-- FOR UPDATE pattern as assign_plan/record_manual_subscription_payment).
-- Capacity is always computed live from appointment_participants — no
-- separate counter to keep in sync, so cancelling immediately frees a spot.

CREATE OR REPLACE FUNCTION public.request_class_spot(p_appointment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := public.get_tenant_id();
  v_appt      RECORD;
  v_taken     INT;
  v_id        UUID;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT id, tenant_id, class_template_id, status, start_time, max_participants
    INTO v_appt
    FROM public.appointments
   WHERE id = p_appointment_id
   FOR UPDATE;

  IF v_appt.id IS NULL OR v_appt.tenant_id IS DISTINCT FROM v_tenant_id THEN
    RAISE EXCEPTION 'Clase no encontrada';
  END IF;

  IF v_appt.class_template_id IS NULL THEN
    RAISE EXCEPTION 'Esta cita no admite reservas de cupo';
  END IF;

  IF v_appt.status != 'scheduled' THEN
    RAISE EXCEPTION 'Esta clase ya no admite reservas';
  END IF;

  IF v_appt.start_time <= NOW() THEN
    RAISE EXCEPTION 'Esta clase ya inició';
  END IF;

  SELECT COUNT(*) INTO v_taken
    FROM public.appointment_participants
   WHERE appointment_id = p_appointment_id
     AND status IN ('pending_confirmation', 'confirmed');

  IF v_taken >= v_appt.max_participants THEN
    RAISE EXCEPTION 'No hay cupo disponible para esta clase';
  END IF;

  INSERT INTO public.appointment_participants (appointment_id, user_id, tenant_id, status, requested_at)
  VALUES (p_appointment_id, auth.uid(), v_tenant_id, 'pending_confirmation', NOW())
  ON CONFLICT (appointment_id, user_id) DO UPDATE
    SET status = 'pending_confirmation', requested_at = NOW(), cancelled_at = NULL, confirmed_at = NULL
    WHERE public.appointment_participants.status = 'cancelled'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Ya tienes un cupo reservado en esta clase';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_class_spot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_class_spot(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_class_spot(p_appointment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.appointment_participants
  SET status = 'cancelled', cancelled_at = NOW()
  WHERE appointment_id = p_appointment_id
    AND user_id = auth.uid()
    AND status IN ('pending_confirmation', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes un cupo activo en esta clase';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_class_spot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_class_spot(UUID) TO authenticated;

-- Admin (appointments.manage) or the class's own assigned coach may approve
-- a pending request or mark attendance — same ownership fallback already
-- used by the appointments_coach_own RLS policy (coach_id = auth.uid()).

CREATE OR REPLACE FUNCTION public.confirm_class_spot(p_participant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_coach_id  UUID;
BEGIN
  SELECT a.tenant_id, a.coach_id INTO v_tenant_id, v_coach_id
    FROM public.appointment_participants ap
    JOIN public.appointments a ON a.id = ap.appointment_id
   WHERE ap.id = p_participant_id;

  IF v_tenant_id IS NULL OR v_tenant_id IS DISTINCT FROM public.get_tenant_id()
     OR NOT (public.has_permission('appointments.manage') OR v_coach_id = auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.appointment_participants
  SET status = 'confirmed', confirmed_at = NOW()
  WHERE id = p_participant_id AND status = 'pending_confirmation';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud ya no está pendiente';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_class_spot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_class_spot(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_class_attendance(p_participant_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_coach_id  UUID;
BEGIN
  IF p_status NOT IN ('attended', 'no_show') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;

  SELECT a.tenant_id, a.coach_id INTO v_tenant_id, v_coach_id
    FROM public.appointment_participants ap
    JOIN public.appointments a ON a.id = ap.appointment_id
   WHERE ap.id = p_participant_id;

  IF v_tenant_id IS NULL OR v_tenant_id IS DISTINCT FROM public.get_tenant_id()
     OR NOT (public.has_permission('appointments.manage') OR v_coach_id = auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.appointment_participants
  SET status = p_status
  WHERE id = p_participant_id
    AND status IN ('confirmed', 'pending_confirmation');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo actualizar la asistencia';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_class_attendance(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_class_attendance(UUID, TEXT) TO authenticated;
