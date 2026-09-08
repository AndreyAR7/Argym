-- Informational attendance-vs-cancellation history per client, combining
-- 1:1 appointments (appointments.status) and group-class bookings
-- (appointment_participants.status) — no maintained counter table, computed
-- live to avoid drift.

CREATE OR REPLACE FUNCTION public.get_client_appointment_stats(p_client_id UUID)
RETURNS TABLE (attended_count INT, cancelled_count INT, no_show_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_client_id;

  IF v_tenant_id IS NULL OR v_tenant_id IS DISTINCT FROM public.get_tenant_id()
     OR NOT public.has_permission('appointments.manage') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    (
      (SELECT COUNT(*) FROM public.appointments
        WHERE client_id = p_client_id AND class_template_id IS NULL AND status = 'completed')
      +
      (SELECT COUNT(*) FROM public.appointment_participants
        WHERE user_id = p_client_id AND status = 'attended')
    )::INT AS attended_count,
    (
      (SELECT COUNT(*) FROM public.appointments
        WHERE client_id = p_client_id AND class_template_id IS NULL AND status = 'cancelled')
      +
      (SELECT COUNT(*) FROM public.appointment_participants
        WHERE user_id = p_client_id AND status = 'cancelled')
    )::INT AS cancelled_count,
    (
      (SELECT COUNT(*) FROM public.appointments
        WHERE client_id = p_client_id AND class_template_id IS NULL AND status = 'no_show')
      +
      (SELECT COUNT(*) FROM public.appointment_participants
        WHERE user_id = p_client_id AND status = 'no_show')
    )::INT AS no_show_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_appointment_stats(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_appointment_stats(UUID) TO authenticated;
