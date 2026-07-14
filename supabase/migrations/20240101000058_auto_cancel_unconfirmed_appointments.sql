-- ============================================================
-- Migration 000058: Auto-cancel unconfirmed appointments
--
-- Appointments that remain in 'pending_confirmation' for more
-- than 15 minutes past their start_time are automatically
-- cancelled by a pg_cron job that runs every 5 minutes.
-- ============================================================

-- Function called by the cron job
DROP FUNCTION IF EXISTS public.auto_cancel_unconfirmed_appointments CASCADE;
CREATE OR REPLACE FUNCTION public.auto_cancel_unconfirmed_appointments()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.appointments
  SET status = 'cancelled'
  WHERE status = 'pending_confirmation'
    AND start_time < NOW() - INTERVAL '15 minutes';
END;
$$;

-- Schedule every 5 minutes
SELECT cron.schedule(
  'auto-cancel-unconfirmed-appointments',
  '*/5 * * * *',
  $$SELECT public.auto_cancel_unconfirmed_appointments()$$
);
