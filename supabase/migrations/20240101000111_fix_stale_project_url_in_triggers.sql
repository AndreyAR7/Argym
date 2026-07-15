-- ============================================================
-- Migration 000111: Fix stale project URL in DB → Edge Function calls
--
-- Every trigger/cron function that calls send-communication or notify-push
-- via net.http_post() hardcodes the OLD project's URL
-- (https://wzvhxkleswlzzobxtmfv.supabase.co), left over from before the
-- migration to the current project (https://soxlhslpgnegmihjdwod.supabase.co
-- — see apps/mobile/.env / apps/web/.env). Since the internal webhook secret
-- differs per project, these calls have been silently failing with 403
-- Forbidden (or hitting a project that no longer serves this data) — meaning
-- appointment confirmations/reminders, plan purchase/expiry emails, welcome
-- emails, and mobile push notifications have not actually been delivered.
--
-- Fix: store the base URL in app_internal_config (same pattern as the
-- webhook secret) and read it dynamically, so a future project migration
-- only requires updating one row instead of eight functions again.
--
-- Second, more serious bug found while fixing the above: migration 000089
-- did `DROP FUNCTION ... CASCADE` on 5 of these trigger functions and never
-- recreated the triggers that were dropped along with them (a trigger
-- depends on its function, so CASCADE removes both). The functions below
-- (on_appointment_communication, on_appointment_status_communication,
-- on_subscription_communication, on_subscription_status_communication,
-- on_profile_approval_communication) have not existed since 000089 ran —
-- meaning appointment/subscription/approval emails have not been triggered
-- at all, independent of the URL bug. Both are fixed here: recreate the
-- functions with the dynamic URL AND reattach the triggers.
-- ============================================================

INSERT INTO public.app_internal_config (key, value)
VALUES ('functions_base_url', 'https://soxlhslpgnegmihjdwod.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DROP FUNCTION IF EXISTS public.get_functions_base_url CASCADE;
CREATE OR REPLACE FUNCTION public.get_functions_base_url()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_internal_config WHERE key = 'functions_base_url'
$$;

REVOKE ALL ON FUNCTION public.get_functions_base_url() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_functions_base_url() TO service_role;

-- ── Recreate the 7 communication trigger/cron functions with dynamic URL ────

DROP FUNCTION IF EXISTS public.trigger_appointment_communication CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_appointment_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url     := public.get_functions_base_url() || '/functions/v1/send-communication',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret')
    ),
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

DROP FUNCTION IF EXISTS public.trigger_appointment_status_communication CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_appointment_status_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event_type TEXT;
  v_secret     TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF    NEW.status = 'confirmed' THEN v_event_type := 'appointment.confirmed';
  ELSIF NEW.status = 'cancelled' THEN v_event_type := 'appointment.cancelled';
  ELSE  RETURN NEW;
  END IF;

  v_secret := (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret');

  PERFORM net.http_post(
    url     := public.get_functions_base_url() || '/functions/v1/send-communication',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', v_secret
    ),
    body    := jsonb_build_object(
      'event_type',     v_event_type,
      'appointment_id', NEW.id::text,
      'tenant_id',      NEW.tenant_id::text
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_communication ON public.appointments;
CREATE TRIGGER on_appointment_communication
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_appointment_communication();

DROP TRIGGER IF EXISTS on_appointment_status_communication ON public.appointments;
CREATE TRIGGER on_appointment_status_communication
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_appointment_status_communication();

DROP FUNCTION IF EXISTS public.trigger_subscription_communication CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_subscription_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM net.http_post(
      url     := public.get_functions_base_url() || '/functions/v1/send-communication',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'x-webhook-secret', (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret')
      ),
      body    := jsonb_build_object(
        'event_type',      'plan.purchased',
        'subscription_id', NEW.id::text,
        'tenant_id',       NEW.tenant_id::text
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_communication ON public.user_subscriptions;
CREATE TRIGGER on_subscription_communication
  AFTER INSERT ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_subscription_communication();

DROP FUNCTION IF EXISTS public.trigger_subscription_status_communication CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_subscription_status_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'expired' THEN
    PERFORM net.http_post(
      url     := public.get_functions_base_url() || '/functions/v1/send-communication',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'x-webhook-secret', (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret')
      ),
      body    := jsonb_build_object(
        'event_type',      'plan.expired',
        'subscription_id', NEW.id::text,
        'tenant_id',       NEW.tenant_id::text
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_status_communication ON public.user_subscriptions;
CREATE TRIGGER on_subscription_status_communication
  AFTER UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_subscription_status_communication();

DROP FUNCTION IF EXISTS public.trigger_profile_approval_communication CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_profile_approval_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_base   TEXT;
BEGIN
  IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN RETURN NEW; END IF;
  IF NEW.approval_status <> 'approved' THEN RETURN NEW; END IF;

  v_secret := (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret');
  v_base   := public.get_functions_base_url();

  PERFORM net.http_post(
    url     := v_base || '/functions/v1/send-communication',
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', v_secret),
    body    := jsonb_build_object('event_type','client.approved','user_id',NEW.id::text,'tenant_id',NEW.tenant_id::text)
  );

  PERFORM net.http_post(
    url     := v_base || '/functions/v1/send-communication',
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', v_secret),
    body    := jsonb_build_object('event_type','client.welcome','user_id',NEW.id::text,'tenant_id',NEW.tenant_id::text)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_approval_communication ON public.profiles;
CREATE TRIGGER on_profile_approval_communication
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_profile_approval_communication();

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
     WHERE status IN ('pending', 'confirmed')
       AND start_time BETWEEN NOW() + INTERVAL '25 minutes'
                          AND NOW() + INTERVAL '35 minutes'
       AND reminder_sent_at IS NULL
  LOOP
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
  END LOOP;

  RETURN v_count;
END;
$$;

DROP FUNCTION IF EXISTS public.send_expiring_plan_warnings CASCADE;
CREATE OR REPLACE FUNCTION public.send_expiring_plan_warnings()
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
        url     := v_base || '/functions/v1/send-communication',
        headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', v_secret),
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

-- ── Recreate the push-notification queue processor with dynamic URL ────────
DROP FUNCTION IF EXISTS public.process_notification_queue CASCADE;
CREATE OR REPLACE FUNCTION public.process_notification_queue(
  p_batch_size INT DEFAULT 50
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_ids     UUID[];
  v_secret  TEXT;
  v_count   INT := 0;
BEGIN
  WITH claimed AS (
    UPDATE public.notification_queue
       SET status = 'processing'
     WHERE id IN (
       SELECT id
         FROM public.notification_queue
        WHERE status = 'pending'
          AND channel = 'push'
        ORDER BY created_at
        LIMIT p_batch_size
          FOR UPDATE SKIP LOCKED
     )
    RETURNING id
  )
  SELECT array_agg(id) INTO v_ids FROM claimed;

  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RETURN 0;
  END IF;

  v_secret := (
    SELECT value FROM public.app_internal_config
     WHERE key = 'internal_webhook_secret'
  );

  PERFORM net.http_post(
    url     := public.get_functions_base_url() || '/functions/v1/notify-push',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', v_secret
    ),
    body    := (
      SELECT jsonb_build_object(
        'notifications',
        jsonb_agg(
          jsonb_build_object(
            'user_id', nq.user_id::text,
            'title',   nq.title,
            'message', nq.message,
            'type',    nq.notification_type
          )
        )
      )
      FROM public.notification_queue nq
      WHERE nq.id = ANY(v_ids)
    )
  );

  UPDATE public.notification_queue
     SET status       = 'sent',
         processed_at = NOW()
   WHERE id = ANY(v_ids);

  v_count := array_length(v_ids, 1);
  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.notification_queue
     SET status      = 'pending',
         retry_count = retry_count + 1,
         error_msg   = SQLERRM
   WHERE id = ANY(v_ids);
  RETURN 0;
END;
$$;

REVOKE ALL ON FUNCTION public.process_notification_queue(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_notification_queue(INT) TO service_role;
