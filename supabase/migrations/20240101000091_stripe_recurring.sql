-- ============================================================
-- Migration 000091: Stripe recurring billing support
--
-- Adds stripe_subscription_id to user_subscriptions so webhook
-- events (invoice.payment_succeeded, customer.subscription.deleted)
-- can reliably find and update the correct local subscription record.
-- ============================================================

-- ── 1. Add stripe_subscription_id column ────────────────────────────────
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_subs_stripe_sub_id
  ON public.user_subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ── 2. RPC: extend end_date on successful renewal ────────────────────────
-- Called by the webhook when Stripe fires invoice.payment_succeeded for a
-- recurring subscription (billing_reason != 'subscription_create').
-- Handles the race where expire_due_subscriptions ran before the webhook:
-- extends from MAX(current end_date, now) so no time is lost.
DROP FUNCTION IF EXISTS public.renew_client_subscription CASCADE;
CREATE OR REPLACE FUNCTION public.renew_client_subscription(
  p_stripe_subscription_id TEXT,
  p_payment_ref            TEXT    DEFAULT NULL,
  p_final_price            NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id        UUID;
  v_billing_cycle TEXT;
  v_current_end   TIMESTAMPTZ;
  v_new_end       TIMESTAMPTZ;
BEGIN
  SELECT us.id, p.billing_cycle, us.end_date
  INTO   v_sub_id, v_billing_cycle, v_current_end
  FROM   public.user_subscriptions us
  JOIN   public.plans p ON p.id = us.plan_id
  WHERE  us.stripe_subscription_id = p_stripe_subscription_id
    AND  us.status IN ('active', 'expired')
  ORDER  BY us.created_at DESC
  LIMIT  1;

  IF v_sub_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_new_end := CASE v_billing_cycle
    WHEN 'monthly' THEN GREATEST(COALESCE(v_current_end, NOW()), NOW()) + INTERVAL '1 month'
    WHEN 'yearly'  THEN GREATEST(COALESCE(v_current_end, NOW()), NOW()) + INTERVAL '1 year'
    ELSE NULL
  END;

  UPDATE public.user_subscriptions
  SET status            = 'active',
      end_date          = v_new_end,
      updated_at        = NOW(),
      final_price       = COALESCE(p_final_price, final_price),
      payment_reference = COALESCE(p_payment_ref, payment_reference)
  WHERE id = v_sub_id;

  RETURN v_sub_id;
END;
$$;

REVOKE ALL     ON FUNCTION public.renew_client_subscription(TEXT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.renew_client_subscription(TEXT, TEXT, NUMERIC) FROM anon;
GRANT  EXECUTE ON FUNCTION public.renew_client_subscription(TEXT, TEXT, NUMERIC) TO service_role;

-- ── 3. RPC: cancel subscription ──────────────────────────────────────────
-- Called when Stripe fires customer.subscription.deleted (user cancelled,
-- or Stripe's dunning exhausted retries).
DROP FUNCTION IF EXISTS public.cancel_client_subscription CASCADE;
CREATE OR REPLACE FUNCTION public.cancel_client_subscription(
  p_stripe_subscription_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  SELECT id INTO v_sub_id
  FROM   public.user_subscriptions
  WHERE  stripe_subscription_id = p_stripe_subscription_id
    AND  status NOT IN ('cancelled')
  ORDER  BY created_at DESC
  LIMIT  1;

  IF v_sub_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.user_subscriptions
  SET status     = 'cancelled',
      updated_at = NOW()
  WHERE id = v_sub_id;

  RETURN v_sub_id;
END;
$$;

REVOKE ALL     ON FUNCTION public.cancel_client_subscription(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_client_subscription(TEXT) FROM anon;
GRANT  EXECUTE ON FUNCTION public.cancel_client_subscription(TEXT) TO service_role;
