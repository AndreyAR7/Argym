-- ============================================================
-- Migration 000137: send_appointment_reminders() has been
-- throwing on every single run since it was created.
--
-- It filtered `status IN ('pending', 'confirmed')`, but 'pending'
-- has never been a valid appointment_status enum value — the real
-- initial status is 'pending_confirmation' (added in 000057). With
-- no EXCEPTION block, Postgres raised
-- "invalid input value for enum appointment_status" and aborted
-- the entire function on every invocation of the
-- appointment-reminders-every-5min cron (000069) — the
-- appointment.reminder event has never actually fired.
--
-- Also casts to ::text (same defensive pattern already used in
-- 000104's trg_notify_push_appointment_created) and wraps each
-- row in its own EXCEPTION handler so one bad row can't abort the
-- rest of the batch again in the future.
-- ============================================================

DROP FUNCTION IF EXISTS public.send_appointment_reminders CASCADE;
CREATE OR REPLACE FUNCTION public.send_appointment_reminders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row    RECORD;
  v_secret TEXT;
  v_base   TEXT;
  v_count  INT := 0;
BEGIN
  v_secret := (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret');
  v_base   := public.get_functions_base_url();

  FOR v_row IN
    SELECT id, tenant_id
      FROM public.appointments
     WHERE status::text IN ('pending_confirmation', 'confirmed')
       AND start_time BETWEEN NOW() + INTERVAL '25 minutes'
                          AND NOW() + INTERVAL '35 minutes'
       AND reminder_sent_at IS NULL
  LOOP
    BEGIN
      UPDATE public.appointments
         SET reminder_sent_at = NOW()
       WHERE id = v_row.id AND reminder_sent_at IS NULL;

      IF FOUND THEN
        PERFORM net.http_post(
          url     := v_base || '/functions/v1/send-communication',
          headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', v_secret),
          body    := jsonb_build_object(
            'event_type',     'appointment.reminder',
            'appointment_id', v_row.id::text,
            'tenant_id',      v_row.tenant_id::text
          )
        );
        v_count := v_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Never let one bad row (or a transient net.http_post failure) abort
      -- the rest of the batch — this function used to fail completely on
      -- every run over an enum-value typo, silently, for a long time.
      NULL;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;
