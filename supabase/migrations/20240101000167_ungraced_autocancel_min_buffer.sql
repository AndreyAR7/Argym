-- 000159's auto_cancel_ungraced_requests cancelled any pending_confirmation
-- appointment/participant request within appointment_grace_hours of its
-- start time, with no floor on how recently it was created. A same-day
-- appointment booked for e.g. 20 minutes from now starts life already
-- inside the grace window, so the very next cron tick (every 5 min)
-- cancelled it before anyone had a real chance to confirm — appointments
-- created for "soon" silently vanished with no error surfaced anywhere
-- (the INSERT succeeds; the cancellation happens seconds later, server
-- side, invisible to the app that created it).
--
-- Adds a floor: never auto-cancel something created less than 15 minutes
-- ago, regardless of how close start_time is. Preserves the original
-- intent (don't let stale unconfirmed requests linger past the grace
-- cutoff) for anything booked with real lead time.

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
    AND a.created_at <= NOW() - INTERVAL '15 minutes'
    AND a.start_time <= NOW() + (t.appointment_grace_hours || ' hours')::INTERVAL;

  -- Individual group-class booking requests too close to the class start —
  -- only that person's spot is freed, the class itself is untouched.
  UPDATE public.appointment_participants ap
  SET status = 'cancelled', cancelled_at = NOW()
  FROM public.appointments a
  JOIN public.tenants t ON t.id = a.tenant_id
  WHERE ap.appointment_id = a.id
    AND ap.status = 'pending_confirmation'
    AND ap.requested_at <= NOW() - INTERVAL '15 minutes'
    AND a.start_time > NOW()
    AND a.start_time <= NOW() + (t.appointment_grace_hours || ' hours')::INTERVAL;
END;
$$;
