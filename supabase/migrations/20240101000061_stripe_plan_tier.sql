-- Add plan_tier to plans for level-based filtering
-- Values: null (all levels), 'beginner', 'intermediate', 'advanced'
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS plan_tier TEXT
  CHECK (plan_tier IN ('beginner', 'intermediate', 'advanced'));

-- Add stripe_customer_id to profiles for recurring billing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- RPC: create_client_subscription
-- Called by the Stripe webhook (service role) to activate a subscription
-- SECURITY DEFINER so it can bypass RLS when called via service role
CREATE OR REPLACE FUNCTION public.create_client_subscription(
  p_user_id         UUID,
  p_tenant_id       UUID,
  p_plan_id         UUID,
  p_promotion_id    UUID,
  p_final_price     NUMERIC,
  p_payment_ref     TEXT,
  p_billing_cycle   TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub_id UUID;
  v_end    TIMESTAMPTZ;
BEGIN
  v_end := CASE p_billing_cycle
    WHEN 'monthly'  THEN NOW() + INTERVAL '1 month'
    WHEN 'yearly'   THEN NOW() + INTERVAL '1 year'
    ELSE NULL
  END;

  INSERT INTO public.user_subscriptions (
    user_id, tenant_id, plan_id, promotion_id,
    status, start_date, end_date, payment_reference, final_price
  ) VALUES (
    p_user_id, p_tenant_id, p_plan_id, p_promotion_id,
    'active', NOW(), v_end, p_payment_ref, p_final_price
  )
  RETURNING id INTO v_sub_id;

  RETURN v_sub_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_subscription(UUID, UUID, UUID, UUID, NUMERIC, TEXT, TEXT) TO service_role;
