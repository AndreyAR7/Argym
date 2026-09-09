-- The grace period before auto-cancelling an unconfirmed request was
-- tenant-wide only (tenants.appointment_grace_hours). A gym running both
-- a "book same-day, no penalty" drop-in class and a "book a week ahead"
-- premium 1:1 program had no way to give them different windows. Adds an
-- optional override at the class-template level (group classes) and at
-- the individual-appointment level (1:1s), falling back to the tenant
-- default when NULL — same COALESCE pattern used elsewhere in this schema.

ALTER TABLE public.class_templates
  ADD COLUMN IF NOT EXISTS grace_hours_override NUMERIC
    CHECK (grace_hours_override IS NULL OR grace_hours_override > 0);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS grace_hours_override NUMERIC
    CHECK (grace_hours_override IS NULL OR grace_hours_override > 0);

CREATE OR REPLACE FUNCTION public.auto_cancel_ungraced_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1:1 appointments still pending too close to their start time.
  -- grace_hours_override on the appointment itself wins when set.
  UPDATE public.appointments a
  SET status = 'cancelled', updated_at = NOW()
  FROM public.tenants t
  WHERE a.tenant_id = t.id
    AND a.class_template_id IS NULL
    AND a.status = 'pending_confirmation'
    AND a.created_at <= NOW() - INTERVAL '15 minutes'
    AND a.start_time <= NOW() + (COALESCE(a.grace_hours_override, t.appointment_grace_hours) || ' hours')::INTERVAL;

  -- Individual group-class booking requests too close to the class start —
  -- only that person's spot is freed, the class itself is untouched.
  -- grace_hours_override on the class_template wins when set.
  UPDATE public.appointment_participants ap
  SET status = 'cancelled', cancelled_at = NOW()
  FROM public.appointments a
  JOIN public.tenants t ON t.id = a.tenant_id
  LEFT JOIN public.class_templates ct ON ct.id = a.class_template_id
  WHERE ap.appointment_id = a.id
    AND ap.status = 'pending_confirmation'
    AND ap.requested_at <= NOW() - INTERVAL '15 minutes'
    AND a.start_time > NOW()
    AND a.start_time <= NOW() + (COALESCE(ct.grace_hours_override, t.appointment_grace_hours) || ' hours')::INTERVAL;
END;
$$;
