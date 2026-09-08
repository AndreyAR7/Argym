-- Replaces auto_cancel_unconfirmed_appointments (000058), which cancelled
-- pending_confirmation appointments 15 minutes AFTER they had already
-- started (hardcoded window). The actual need is to free the slot BEFORE
-- start time, using a per-tenant configurable grace period
-- (tenants.appointment_grace_hours, added in 000155) — this covers both
-- 1:1 appointments and, new here, individual pending group-class requests
-- (cancelling one participant's row does not affect the rest of the class).

CREATE OR REPLACE FUNCTION public.auto_cancel_ungraced_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1:1 appointments still pending too close to their start time.
  UPDATE public.appointments a
  SET status = 'cancelled', updated_at = NOW()
  FROM public.tenants t
  WHERE a.tenant_id = t.id
    AND a.class_template_id IS NULL
    AND a.status = 'pending_confirmation'
    AND a.start_time <= NOW() + (t.appointment_grace_hours || ' hours')::INTERVAL;

  -- Individual group-class booking requests too close to the class start —
  -- only that person's spot is freed, the class itself is untouched.
  UPDATE public.appointment_participants ap
  SET status = 'cancelled', cancelled_at = NOW()
  FROM public.appointments a
  JOIN public.tenants t ON t.id = a.tenant_id
  WHERE ap.appointment_id = a.id
    AND ap.status = 'pending_confirmation'
    AND a.start_time > NOW()
    AND a.start_time <= NOW() + (t.appointment_grace_hours || ' hours')::INTERVAL;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_cancel_ungraced_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cancel_ungraced_requests() TO service_role;

SELECT cron.unschedule('auto-cancel-unconfirmed-appointments');

SELECT cron.schedule(
  'auto-cancel-ungraced-appointments',
  '*/5 * * * *',
  $$SELECT public.auto_cancel_ungraced_requests()$$
);
