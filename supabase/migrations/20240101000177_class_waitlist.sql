-- A full class today just refuses request_class_spot with no recourse —
-- the client has to keep manually re-checking. Adds a waitlist: join when
-- full, and the moment an existing participant cancels, the longest-
-- waiting person on the list is auto-promoted straight to 'confirmed'
-- (they already committed to wait; no reason to make them re-request and
-- wait on approval again) and notified in-app.

CREATE TABLE public.class_waitlist (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at    TIMESTAMPTZ,
  UNIQUE (appointment_id, user_id)
);

CREATE INDEX idx_class_waitlist_appointment ON public.class_waitlist(appointment_id, joined_at);

ALTER TABLE public.class_waitlist ENABLE ROW LEVEL SECURITY;

-- Same read shape as appointment_participants: the person themselves, the
-- class's coach, or an admin. No direct INSERT/UPDATE/DELETE policy for
-- regular users — joining/leaving only happens through the RPCs below
-- (SECURITY DEFINER), so capacity/eligibility can't be bypassed client-side.
CREATE POLICY "class_waitlist_read" ON public.class_waitlist
  FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND (
      user_id = auth.uid()
      OR public.has_permission('appointments.manage')
      OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.coach_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.join_waitlist(p_appointment_id UUID)
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
    RAISE EXCEPTION 'Esta cita no admite lista de espera';
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

  IF v_taken < v_appt.max_participants THEN
    RAISE EXCEPTION 'Hay cupo disponible — reserva directamente en vez de unirte a la lista de espera';
  END IF;

  INSERT INTO public.class_waitlist (appointment_id, user_id, tenant_id)
  VALUES (p_appointment_id, auth.uid(), v_tenant_id)
  ON CONFLICT (appointment_id, user_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Ya estás en la lista de espera de esta clase';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_waitlist(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_waitlist(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_waitlist(p_appointment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.class_waitlist
  WHERE appointment_id = p_appointment_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No estás en la lista de espera de esta clase';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_waitlist(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_waitlist(UUID) TO authenticated;

-- Extend cancel_class_spot: lock the appointment row (previously
-- unlocked — a race with a concurrent request_class_spot/join_waitlist
-- was possible) and, once a spot is freed, promote the longest-waiting
-- person straight to 'confirmed'.
CREATE OR REPLACE FUNCTION public.cancel_class_spot(p_appointment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_promoted  RECORD;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;

  UPDATE public.appointment_participants
  SET status = 'cancelled', cancelled_at = NOW()
  WHERE appointment_id = p_appointment_id
    AND user_id = auth.uid()
    AND status IN ('pending_confirmation', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes un cupo activo en esta clase';
  END IF;

  SELECT id, user_id INTO v_promoted
    FROM public.class_waitlist
   WHERE appointment_id = p_appointment_id
   ORDER BY joined_at
   LIMIT 1;

  IF v_promoted.id IS NOT NULL THEN
    INSERT INTO public.appointment_participants (appointment_id, user_id, tenant_id, status, requested_at, confirmed_at)
    VALUES (p_appointment_id, v_promoted.user_id, v_tenant_id, 'confirmed', NOW(), NOW())
    ON CONFLICT (appointment_id, user_id) DO UPDATE
      SET status = 'confirmed', confirmed_at = NOW(), cancelled_at = NULL
      WHERE public.appointment_participants.status = 'cancelled';

    DELETE FROM public.class_waitlist WHERE id = v_promoted.id;

    BEGIN
      INSERT INTO public.notifications (user_id, tenant_id, type, title, message, related_entity_type, related_entity_id)
      SELECT v_promoted.user_id, v_tenant_id, 'waitlist_promoted', 'Cupo confirmado',
             'Se liberó un cupo en "' || a.title || '" y quedaste confirmado automáticamente.',
             'appointment', p_appointment_id
      FROM public.appointments a WHERE a.id = p_appointment_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_class_spot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_class_spot(UUID) TO authenticated;
