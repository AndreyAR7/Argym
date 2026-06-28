-- create_client_subscription (Stripe webhook / success-page fallback)
-- now creates a paid invoice alongside the subscription row.
-- assign_plan (manual admin) already created pending invoices — unchanged.

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
  v_sub_id    UUID;
  v_end       TIMESTAMPTZ;
  v_plan_name TEXT;
  v_currency  TEXT;
BEGIN
  -- Lookup plan name and currency for the invoice description
  SELECT name, currency
    INTO v_plan_name, v_currency
    FROM public.plans
   WHERE id = p_plan_id;

  v_end := CASE p_billing_cycle
    WHEN 'monthly' THEN NOW() + INTERVAL '1 month'
    WHEN 'yearly'  THEN NOW() + INTERVAL '1 year'
    ELSE NULL
  END;

  -- Insert subscription (idempotent: skip on duplicate payment_reference)
  INSERT INTO public.user_subscriptions (
    user_id, tenant_id, plan_id, promotion_id,
    status, start_date, end_date, payment_reference, final_price
  ) VALUES (
    p_user_id, p_tenant_id, p_plan_id, p_promotion_id,
    'active', NOW(), v_end, p_payment_ref, p_final_price
  )
  ON CONFLICT (payment_reference) DO NOTHING
  RETURNING id INTO v_sub_id;

  -- If conflict (already existed), fetch the existing subscription id
  IF v_sub_id IS NULL AND p_payment_ref IS NOT NULL THEN
    SELECT id INTO v_sub_id
      FROM public.user_subscriptions
     WHERE payment_reference = p_payment_ref
     LIMIT 1;
    -- Subscription already created — invoice already exists too, nothing more to do
    RETURN v_sub_id;
  END IF;

  -- Create a paid invoice (Stripe already collected the money)
  INSERT INTO public.invoices (
    tenant_id, user_id, subscription_id,
    amount, currency, description,
    status, issue_date, paid_at
  ) VALUES (
    p_tenant_id, p_user_id, v_sub_id,
    p_final_price,
    COALESCE(v_currency, 'CRC'),
    'Stripe · ' || COALESCE(v_plan_name, 'Plan'),
    'paid',
    NOW(),
    NOW()
  );

  RETURN v_sub_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_subscription(UUID, UUID, UUID, UUID, NUMERIC, TEXT, TEXT) TO service_role;
