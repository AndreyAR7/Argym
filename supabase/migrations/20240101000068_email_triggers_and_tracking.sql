-- ============================================================
-- Migration 000068: Remaining email triggers + tracking columns
--
-- 1. reminder_sent_at on appointments  (prevents duplicate reminders)
-- 2. expiry_warning_sent_at on user_subscriptions
-- 3. Trigger: plan.expired  (subscription status → expired)
-- 4. Trigger: client.approved + client.welcome  (profile approval)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── 1. Tracking columns ───────────────────────────────────────────

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS expiry_warning_sent_at TIMESTAMPTZ;

-- ── 2. Trigger: plan.expired ──────────────────────────────────────

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
      headers := jsonb_build_object('Content-Type', 'application/json'),
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

-- ── 3. Trigger: client.approved + client.welcome ─────────────────

DROP FUNCTION IF EXISTS public.trigger_profile_approval_communication CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_profile_approval_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Only fire when approval_status actually changes to 'approved'
  IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN RETURN NEW; END IF;
  IF NEW.approval_status <> 'approved' THEN RETURN NEW; END IF;

  -- Formal approval notification
  PERFORM net.http_post(
    url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'event_type', 'client.approved',
      'user_id',    NEW.id::text,
      'tenant_id',  NEW.tenant_id::text
    )
  );

  -- Warm onboarding / welcome email (separate rule + template)
  PERFORM net.http_post(
    url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'event_type', 'client.welcome',
      'user_id',    NEW.id::text,
      'tenant_id',  NEW.tenant_id::text
    )
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
