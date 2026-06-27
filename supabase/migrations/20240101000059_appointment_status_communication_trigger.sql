-- ============================================================
-- Migration 000059: Appointment status change communication trigger
--
-- Fires the send-communication Edge Function when an appointment
-- status changes to 'confirmed' or 'cancelled'.
-- Complements migration 000054 which handles INSERT (appointment.created).
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_appointment_status_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event_type TEXT;
BEGIN
  -- Only fire when status actually changes
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'confirmed' THEN
    v_event_type := 'appointment.confirmed';
  ELSIF NEW.status = 'cancelled' THEN
    v_event_type := 'appointment.cancelled';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'event_type',     v_event_type,
      'appointment_id', NEW.id::text,
      'tenant_id',      NEW.tenant_id::text
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the status update
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_status_communication ON public.appointments;

CREATE TRIGGER on_appointment_status_communication
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_appointment_status_communication();
