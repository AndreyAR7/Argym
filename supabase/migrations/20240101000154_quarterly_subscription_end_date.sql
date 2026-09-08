-- Wire the new 'quarterly' billing cycle into both places that compute a
-- subscription's end_date: subscription_end_date() (used by assign_plan,
-- the admin "Asignar plan" manual path) and create_client_subscription
-- (the Stripe/self-purchase path, which previously inlined its own
-- monthly/yearly-only CASE instead of calling subscription_end_date() —
-- now it does, so the two paths can't drift out of sync again).

CREATE OR REPLACE FUNCTION public.subscription_end_date(
  p_start      TIMESTAMPTZ,
  p_cycle      TEXT          -- 'monthly' | 'quarterly' | 'yearly' | 'one_time'
)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_cycle
    WHEN 'monthly'   THEN p_start + INTERVAL '1 month'
    WHEN 'quarterly' THEN p_start + INTERVAL '3 months'
    WHEN 'yearly'    THEN p_start + INTERVAL '1 year'
    WHEN 'one_time'  THEN NULL   -- never expires
    ELSE p_start + INTERVAL '1 month'
  END;
END;
$$;

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
SET search_path = public
AS $$
DECLARE
  v_sub_id    UUID;
  v_end       TIMESTAMPTZ;
  v_plan_name TEXT;
  v_currency  TEXT;
BEGIN
  -- This RPC is called both by the service-role Stripe webhook and directly
  -- by the client's own session as a fallback (success page, in case the
  -- webhook hasn't landed yet) — restrict the latter path to the caller's
  -- own user id, same pattern as award_checkin/award_gym_checkin.
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot create a subscription on behalf of another user';
  END IF;

  SELECT name, currency
    INTO v_plan_name, v_currency
    FROM public.plans
   WHERE id = p_plan_id;

  v_end := public.subscription_end_date(NOW(), p_billing_cycle);

  -- Idempotent (000064): a retried webhook for the same Stripe checkout
  -- session (same payment_reference) must not throw or double-insert.
  INSERT INTO public.user_subscriptions (
    user_id, tenant_id, plan_id, promotion_id,
    status, start_date, end_date, payment_reference, final_price
  ) VALUES (
    p_user_id, p_tenant_id, p_plan_id, p_promotion_id,
    'active', NOW(), v_end, p_payment_ref, p_final_price
  )
  ON CONFLICT (payment_reference) DO NOTHING
  RETURNING id INTO v_sub_id;

  IF v_sub_id IS NULL AND p_payment_ref IS NOT NULL THEN
    SELECT id INTO v_sub_id
      FROM public.user_subscriptions
     WHERE payment_reference = p_payment_ref
     LIMIT 1;
    -- Subscription (and its invoice) already existed — nothing more to do.
    RETURN v_sub_id;
  END IF;

  -- Paid invoice (000065): Stripe already collected the money.
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

  -- Auto-assign routines linked to the plan (000086)
  INSERT INTO public.routine_assignments (routine_id, client_id, tenant_id)
  SELECT pr.routine_id, p_user_id, p_tenant_id
  FROM public.plan_routines pr
  WHERE pr.plan_id = p_plan_id
  ON CONFLICT DO NOTHING;

  -- Auto-assign routines linked to the promotion (if any) (000086)
  IF p_promotion_id IS NOT NULL THEN
    INSERT INTO public.routine_assignments (routine_id, client_id, tenant_id)
    SELECT por.routine_id, p_user_id, p_tenant_id
    FROM public.promotion_routines por
    WHERE por.promotion_id = p_promotion_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_sub_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_subscription(UUID, UUID, UUID, UUID, NUMERIC, TEXT, TEXT)
  TO service_role, authenticated;
