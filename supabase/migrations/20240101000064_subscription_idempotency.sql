-- Prevent duplicate subscriptions from webhook + fallback both firing
-- Add unique constraint on payment_reference for non-null values

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_payment_ref
  ON public.user_subscriptions(payment_reference)
  WHERE payment_reference IS NOT NULL;

-- Update create_client_subscription to be idempotent
-- If a subscription with the same payment_reference already exists, skip the insert
DROP FUNCTION IF EXISTS public.create_client_subscription CASCADE;
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
  ON CONFLICT (payment_reference) DO NOTHING
  RETURNING id INTO v_sub_id;

  -- If nothing was inserted (conflict), return the existing subscription id
  IF v_sub_id IS NULL AND p_payment_ref IS NOT NULL THEN
    SELECT id INTO v_sub_id
      FROM public.user_subscriptions
      WHERE payment_reference = p_payment_ref
      LIMIT 1;
  END IF;

  RETURN v_sub_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_subscription(UUID, UUID, UUID, UUID, NUMERIC, TEXT, TEXT) TO service_role;
