-- Fix: trg_notify_push_appointment_created references literal 'pending' which
-- is not a valid appointment_status enum value, causing INSERT to fail.
-- Cast status to text for the IN comparison.

DROP FUNCTION IF EXISTS public.trg_notify_push_appointment_created CASCADE;
CREATE OR REPLACE FUNCTION public.trg_notify_push_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title   TEXT;
  v_message TEXT;
BEGIN
  IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

  -- Use ::text cast so enum membership check doesn't fail on unlisted values
  IF NEW.status::text NOT IN ('pending_confirmation', 'scheduled', 'pending') THEN
    RETURN NEW;
  END IF;

  v_title   := 'Solicitud de cita recibida';
  v_message := 'Recibimos tu solicitud para ' ||
    COALESCE(NEW.title, 'una cita') || '. Te notificaremos cuando sea confirmada.';

  PERFORM public.enqueue_push_notification(
    NEW.client_id,
    NEW.tenant_id,
    'appointment_created',
    'appointment',
    v_title,
    v_message,
    jsonb_build_object(
      'appointment_id', NEW.id::text,
      'title',          COALESCE(NEW.title, ''),
      'start_time',     COALESCE(NEW.start_time::text, '')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_push_appointment_created ON public.appointments;

CREATE TRIGGER trg_notify_push_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_push_appointment_created();
