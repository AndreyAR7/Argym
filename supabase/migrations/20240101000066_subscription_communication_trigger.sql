-- ============================================================
-- Migration 000066: Subscription communication trigger
--
-- Fires send-communication when a subscription becomes active:
--   · INSERT with status = 'active'  → plan.purchased
-- Never blocks the subscription insert — errors are swallowed.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DROP FUNCTION IF EXISTS public.trigger_subscription_communication CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_subscription_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Only fire for active subscriptions (Stripe payments and manual assigns)
  IF NEW.status = 'active' THEN
    PERFORM net.http_post(
      url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/send-communication',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object(
        'event_type',       'plan.purchased',
        'subscription_id',  NEW.id::text,
        'tenant_id',        NEW.tenant_id::text
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
