-- ============================================================
-- Migration 000069: Scheduled email jobs via pg_cron
--
-- 1. send_appointment_reminders()  — every 5 min, fires 30 min before
-- 2. send_expiring_plan_warnings() — daily at 08:00 UTC, 7 days before expiry
-- ============================================================

-- pg_cron and pg_net already enabled in migrations 000042 and 000054

-- ── 1. Appointment reminder function ─────────────────────────────
-- Finds appointments starting in 25–35 min that haven't been reminded,
-- marks them immediately (prevents duplicates even if the HTTP call fails),
-- then fires send-communication once per appointment.

CREATE OR REPLACE FUNCTION public.send_appointment_reminders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row   RECORD;
  v_count INT := 0;
BEGIN
  FOR v_row IN
    SELECT id, tenant_id
      FROM public.appointments
     WHERE status IN ('pending', 'confirmed')
       AND start_time BETWEEN NOW() + INTERVAL '25 minutes'
                          AND NOW() + INTERVAL '35 minutes'
       AND reminder_sent_at IS NULL
  LOOP
    -- Mark first — prevents duplicate sends even if pg_net retries
    UPDATE public.appointments
       SET reminder_sent_at = NOW()
     WHERE id = v_row.id AND reminder_sent_at IS NULL;

    IF FOUND THEN
      PERFORM net.http_post(
        url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body    := jsonb_build_object(
          'event_type',     'appointment.reminder',
          'appointment_id', v_row.id::text,
          'tenant_id',      v_row.tenant_id::text
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ── 2. Plan expiry warning function ──────────────────────────────
-- Finds active subscriptions expiring in 6–8 days that haven't
-- received a warning, marks them, fires send-communication.

CREATE OR REPLACE FUNCTION public.send_expiring_plan_warnings()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row   RECORD;
  v_count INT := 0;
BEGIN
  FOR v_row IN
    SELECT id, tenant_id
      FROM public.user_subscriptions
     WHERE status = 'active'
       AND end_date IS NOT NULL
       AND end_date BETWEEN NOW() + INTERVAL '6 days'
                        AND NOW() + INTERVAL '8 days'
       AND expiry_warning_sent_at IS NULL
  LOOP
    UPDATE public.user_subscriptions
       SET expiry_warning_sent_at = NOW()
     WHERE id = v_row.id AND expiry_warning_sent_at IS NULL;

    IF FOUND THEN
      PERFORM net.http_post(
        url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body    := jsonb_build_object(
          'event_type',      'plan.expiring',
          'subscription_id', v_row.id::text,
          'tenant_id',       v_row.tenant_id::text
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ── 3. pg_cron schedules ─────────────────────────────────────────

-- Appointment reminders: every 5 minutes
SELECT cron.schedule(
  'appointment-reminders-every-5min',
  '*/5 * * * *',
  $$SELECT public.send_appointment_reminders()$$
);

-- Plan expiry warnings: daily at 08:00 UTC (02:00 am Costa Rica)
SELECT cron.schedule(
  'plan-expiry-warnings-daily',
  '0 8 * * *',
  $$SELECT public.send_expiring_plan_warnings()$$
);
