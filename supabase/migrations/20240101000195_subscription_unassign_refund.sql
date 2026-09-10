-- Admin plan assignment had no way back: `assign_plan` inserts a
-- user_subscriptions row, but there was no UI (web or mobile) to reverse a
-- mistaken assignment, and `cancel_subscription` (which already existed,
-- unused by any UI — see actions.ts's orphaned cancelSubscriptionAction)
-- never touched Stripe at all. Requested flow: admin can unassign a plan
-- they assigned by mistake; if the client actually paid via Stripe, the
-- refund should fire automatically; if it was a manual/staff assignment
-- (no Stripe payment on record), the refund — if any — is handled outside
-- the app, so we just track that no automatic refund happened.
--
-- Stripe identifiers only ever live on user_subscriptions.payment_reference
-- (a Checkout Session id `cs_...` from the initial purchase, or a Stripe
-- Invoice id `in_...` after a recurring renewal — see 20240101000032 and
-- 20240101000091) and stripe_subscription_id. Resolving those into an
-- actual refundable payment_intent happens application-side (only the web
-- app holds STRIPE_SECRET_KEY); this migration only adds where the result
-- of that gets recorded, plus the permission-checked RPC to record it.

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS refund_status   TEXT NOT NULL DEFAULT 'none'
    CHECK (refund_status IN ('none', 'refunded', 'failed')),
  ADD COLUMN IF NOT EXISTS refund_id       TEXT,
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS refunded_at     TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.record_subscription_refund(
  p_subscription_id UUID,
  p_refund_id       TEXT,
  p_amount          NUMERIC,
  p_status          TEXT DEFAULT 'refunded'
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
    FROM public.user_subscriptions WHERE id = p_subscription_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  IF NOT public.has_permission('billing.manage') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF p_status NOT IN ('none', 'refunded', 'failed') THEN
    RAISE EXCEPTION 'Invalid refund status: %', p_status;
  END IF;

  UPDATE public.user_subscriptions
     SET refund_status   = p_status,
         refund_id       = p_refund_id,
         refunded_amount = p_amount,
         refunded_at     = NOW()
   WHERE id = p_subscription_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_subscription_refund(UUID, TEXT, NUMERIC, TEXT) TO authenticated;
