-- ============================================================
-- Migration 000089: Fix webhook auth, scheduling, and RLS
--
-- Problem 1: All DB trigger/cron calls to send-communication had no
--   Authorization header → Edge Function returned 401 silently →
--   zero automated emails were delivered.
-- Problem 2: expire_due_subscriptions() was never scheduled, so
--   monthly/yearly subscriptions accumulated as 'active' forever.
-- Problem 3: email_logs had no UPDATE policy; admin retry actions failed.
--
-- Solution: Store internal webhook secret in a hardened config table.
-- Only accessible via SECURITY DEFINER function — never exposed to
-- anon/authenticated roles. Trigger and cron functions pass this secret
-- in the x-webhook-secret header; Edge Function validates it as an
-- internal path.
-- ============================================================

-- ── 1. Create secure config table for internal secrets ──────────────────
-- No RLS — access is fully blocked via REVOKE; only service_role and the
-- SECURITY DEFINER function below can touch this table.
CREATE TABLE IF NOT EXISTS public.app_internal_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

REVOKE ALL ON public.app_internal_config FROM PUBLIC;
REVOKE ALL ON public.app_internal_config FROM anon;
REVOKE ALL ON public.app_internal_config FROM authenticated;
GRANT  ALL  ON public.app_internal_config TO service_role;

-- ── 2. Seed the webhook secret (idempotent) ─────────────────────────────
-- A 64-char hex value generated at migration run-time; never stored in git.
INSERT INTO public.app_internal_config (key, value)
VALUES (
  'internal_webhook_secret',
  replace(gen_random_uuid()::text, '-', '')
    || replace(gen_random_uuid()::text, '-', '')
)
ON CONFLICT (key) DO NOTHING;

-- ── 3. Helper function: expose the secret via RPC ───────────────────────
-- Edge Function calls supabaseAdmin.rpc('get_webhook_secret') to validate
-- incoming requests. SECURITY DEFINER runs as owner (postgres/service_role)
-- bypassing the REVOKE above; anon/authenticated cannot call it directly.
DROP FUNCTION IF EXISTS public.get_webhook_secret CASCADE;
CREATE OR REPLACE FUNCTION public.get_webhook_secret()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret'
$$;

REVOKE ALL   ON FUNCTION public.get_webhook_secret() FROM PUBLIC;
REVOKE ALL   ON FUNCTION public.get_webhook_secret() FROM anon;
REVOKE ALL   ON FUNCTION public.get_webhook_secret() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_webhook_secret() TO service_role;

-- ── 4. Recreate ALL trigger functions with webhook secret ────────────────

-- 4a. appointment.created
DROP FUNCTION IF EXISTS public.trigger_appointment_communication CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_appointment_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
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

-- 4b. appointment.confirmed / appointment.cancelled
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
    url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
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

-- 4c. plan.purchased (subscription becomes active)
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
      url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
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

-- 4d. plan.expired (subscription status changes to expired)
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
      url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
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

-- 4e. client.approved + client.welcome
DROP FUNCTION IF EXISTS public.trigger_profile_approval_communication CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_profile_approval_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN RETURN NEW; END IF;
  IF NEW.approval_status <> 'approved' THEN RETURN NEW; END IF;

  v_secret := (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret');

  PERFORM net.http_post(
    url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', v_secret),
    body    := jsonb_build_object('event_type','client.approved','user_id',NEW.id::text,'tenant_id',NEW.tenant_id::text)
  );

  PERFORM net.http_post(
    url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', v_secret),
    body    := jsonb_build_object('event_type','client.welcome','user_id',NEW.id::text,'tenant_id',NEW.tenant_id::text)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ── 5. Recreate cron functions with webhook secret ───────────────────────

-- 5a. Appointment reminders (runs every 5 min via pg_cron)
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
  v_count  INT := 0;
BEGIN
  v_secret := (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret');

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
        url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
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

-- 5b. Plan expiry warnings (runs daily at 08:00 UTC via pg_cron)
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
  v_count  INT := 0;
BEGIN
  v_secret := (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret');

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

-- ── 6. Schedule expire_due_subscriptions (was missing from pg_cron) ──────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-due-subscriptions') THEN
    PERFORM cron.unschedule('expire-due-subscriptions');
  END IF;
END $$;

SELECT cron.schedule(
  'expire-due-subscriptions',
  '0 3 * * *',
  $$SELECT public.expire_due_subscriptions()$$
);

-- ── 7. email_logs: UPDATE policy so admin retry actions work ─────────────
DROP POLICY IF EXISTS "email_logs_admin_update" ON public.email_logs;
CREATE POLICY "email_logs_admin_update" ON public.email_logs
  FOR UPDATE
  USING     (tenant_id = public.get_tenant_id())
  WITH CHECK (tenant_id = public.get_tenant_id());

-- ── 8. Tighten function grants ───────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.send_appointment_reminders()  FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_expiring_plan_warnings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_due_subscriptions()    FROM anon;
