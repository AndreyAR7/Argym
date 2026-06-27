-- ============================================================
-- Migration 000054: Communication trigger
--
-- Fires the send-communication Edge Function after each
-- appointment INSERT, asynchronously via pg_net.
-- The trigger never blocks appointment creation — any error
-- in the HTTP call is silently swallowed.
-- ============================================================

-- pg_net is enabled by default on Supabase Cloud.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── Trigger function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_appointment_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'event_type',     'appointment.created',
      'appointment_id', NEW.id::text,
      'tenant_id',      NEW.tenant_id::text
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ── Attach trigger ────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_appointment_communication ON public.appointments;

CREATE TRIGGER on_appointment_communication
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_appointment_communication();
