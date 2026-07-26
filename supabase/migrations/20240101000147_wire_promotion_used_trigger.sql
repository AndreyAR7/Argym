-- ============================================================
-- Migration 000147: Wire up the promotion.used communication event
--
-- 'promotion.used' has been a selectable event_type in the admin
-- correspondencia UI and the send-communication edge function's
-- whitelist since day one (both already handle it — send-communication
-- resolves its variables the same way as plan.* via subscription_id,
-- see event_type.startsWith('promotion.') at index.ts:378-380) but no
-- trigger or cron ever actually dispatches it. Any rule an admin
-- created for it was permanently dead with no indication why.
--
-- Fix: extend the existing user_subscriptions INSERT trigger (already
-- firing plan.purchased) to also fire promotion.used whenever the new
-- subscription actually used a promotion — the natural, obvious
-- definition of "a promotion was used".
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_subscription_communication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_base   TEXT;
BEGIN
  IF NEW.status = 'active' THEN
    v_secret := (SELECT value FROM public.app_internal_config WHERE key = 'internal_webhook_secret');
    v_base   := public.get_functions_base_url();

    PERFORM net.http_post(
      url     := v_base || '/functions/v1/send-communication',
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'x-webhook-secret', v_secret
      ),
      body    := jsonb_build_object(
        'event_type',      'plan.purchased',
        'subscription_id', NEW.id::text,
        'tenant_id',       NEW.tenant_id::text
      )
    );

    IF NEW.promotion_id IS NOT NULL THEN
      PERFORM net.http_post(
        url     := v_base || '/functions/v1/send-communication',
        headers := jsonb_build_object(
          'Content-Type',     'application/json',
          'x-webhook-secret', v_secret
        ),
        body    := jsonb_build_object(
          'event_type',      'promotion.used',
          'subscription_id', NEW.id::text,
          'tenant_id',       NEW.tenant_id::text
        )
      );
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
