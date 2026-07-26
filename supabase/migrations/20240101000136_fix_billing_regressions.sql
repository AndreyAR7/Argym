-- ============================================================
-- Migration 000136: Fix three billing regressions found in a
-- follow-up audit (2026-07-26).
--
-- 1. record_manual_subscription_payment (000132) checks
--    has_permission('billing.manage') but never compares the
--    subscription's own tenant_id against the caller's tenant —
--    an admin who knows/guesses a subscription UUID from another
--    gym could extend it or generate a fake paid invoice for it.
--
-- 2. assign_plan (000110's "critical security fixes" pass) added
--    the correct tenant/permission checks but copied the *old*
--    function body (000024), silently reverting two later
--    improvements: multi-plan support (000034 — stopped cancelling
--    every other active plan on assign) and invoice/end_date
--    creation (000032). Manually-assigned plans since then never
--    expire (end_date left NULL) and never left a pending invoice.
--
-- 3. create_client_subscription (000086, adding routine
--    auto-assignment) was built on the pre-idempotency,
--    pre-invoice version of the function, undoing the
--    ON CONFLICT (payment_reference) DO NOTHING idempotency
--    (000064) and the paid-invoice creation (000065). A retried
--    Stripe webhook for the same checkout session now throws
--    unique_violation uncaught, and Stripe-paid subscriptions
--    since 000086 have no invoice record. Also adds a minimal
--    auth.uid() = p_user_id guard (same pattern already used by
--    award_checkin/award_gym_checkin) since this RPC is callable
--    directly by any authenticated user (apps/web/src/app/client/
--    planes/success/page.tsx calls it with the user's own session,
--    not the service role) and previously trusted p_user_id as-is.
-- ============================================================

-- ── 1. record_manual_subscription_payment: add tenant match ────────────────
DROP FUNCTION IF EXISTS public.record_manual_subscription_payment CASCADE;

CREATE OR REPLACE FUNCTION public.record_manual_subscription_payment(
  p_subscription_id UUID,
  p_months          INT DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id  UUID;
  v_user_id    UUID;
  v_plan_name  TEXT;
  v_price      NUMERIC;
  v_currency   TEXT;
  v_current_end TIMESTAMPTZ;
  v_new_end    TIMESTAMPTZ;
BEGIN
  SELECT us.tenant_id, us.user_id, us.end_date, pl.name, pl.price, pl.currency
  INTO   v_tenant_id, v_user_id, v_current_end, v_plan_name, v_price, v_currency
  FROM   public.user_subscriptions us
  JOIN   public.plans pl ON pl.id = us.plan_id
  WHERE  us.id = p_subscription_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  IF v_tenant_id IS DISTINCT FROM public.get_tenant_id()
     OR NOT public.has_permission('billing.manage') THEN
    RAISE EXCEPTION 'Not authorized to record payment for this subscription';
  END IF;

  v_new_end := GREATEST(COALESCE(v_current_end, NOW()), NOW()) + (p_months || ' months')::INTERVAL;

  UPDATE public.user_subscriptions
  SET status     = 'active',
      end_date   = v_new_end,
      updated_at = NOW()
  WHERE id = p_subscription_id;

  INSERT INTO public.invoices
    (tenant_id, user_id, subscription_id, amount, currency, description, due_date, status, paid_at, notes, created_by)
  VALUES
    (v_tenant_id, v_user_id, p_subscription_id, COALESCE(v_price, 0), COALESCE(v_currency, 'CRC'),
     'Pago manual registrado: ' || COALESCE(v_plan_name, 'membresía') || ' (' || p_months || ' mes(es))',
     NOW(), 'paid', NOW(),
     'Registrado manualmente por administrador (efectivo/transferencia)',
     auth.uid());

  RETURN p_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_manual_subscription_payment(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_manual_subscription_payment(UUID, INT) TO authenticated;

-- ── 2. assign_plan: restore multi-plan + invoice + end_date ────────────────
DROP FUNCTION IF EXISTS public.assign_plan CASCADE;

CREATE OR REPLACE FUNCTION public.assign_plan(
  p_user_id   UUID,
  p_tenant_id UUID,
  p_plan_id   UUID,
  p_price     NUMERIC
)
RETURNS UUID   -- returns new subscription id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name     TEXT;
  v_billing_cycle TEXT;
  v_currency      TEXT;
  v_start         TIMESTAMPTZ := NOW();
  v_end           TIMESTAMPTZ;
  v_sub_id        UUID;
BEGIN
  IF p_tenant_id IS DISTINCT FROM public.get_tenant_id()
     OR NOT public.has_permission('billing.manage') THEN
    RAISE EXCEPTION 'Not authorized to assign plans for this tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'User does not belong to this tenant';
  END IF;

  SELECT name, billing_cycle, currency
    INTO v_plan_name, v_billing_cycle, v_currency
    FROM public.plans
   WHERE id = p_plan_id AND tenant_id = p_tenant_id AND is_active = TRUE;

  IF v_plan_name IS NULL THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  v_end := public.subscription_end_date(v_start, v_billing_cycle);

  -- Multi-plan supported (000034): existing active subscriptions are left
  -- alone. Expiration is handled by end_date (expire_due_subscriptions cron),
  -- not by mutual exclusion at assignment time.
  INSERT INTO public.user_subscriptions
    (user_id, tenant_id, plan_id, status, start_date, end_date, next_billing_date, final_price)
  VALUES
    (p_user_id, p_tenant_id, p_plan_id, 'active', v_start, v_end,
     CASE WHEN v_billing_cycle != 'one_time' THEN v_end ELSE NULL END,
     p_price)
  RETURNING id INTO v_sub_id;

  INSERT INTO public.invoices
    (tenant_id, user_id, subscription_id, amount, currency, description, due_date, status)
  VALUES
    (p_tenant_id, p_user_id, v_sub_id, p_price, COALESCE(v_currency, 'CRC'),
     'Suscripción: ' || v_plan_name,
     NOW() + INTERVAL '7 days',
     'pending');

  RETURN v_sub_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_plan(UUID, UUID, UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_plan(UUID, UUID, UUID, NUMERIC) TO authenticated;

-- ── 3. create_client_subscription: restore idempotency + invoice ──────────
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

  v_end := CASE p_billing_cycle
    WHEN 'monthly' THEN NOW() + INTERVAL '1 month'
    WHEN 'yearly'  THEN NOW() + INTERVAL '1 year'
    ELSE NULL
  END;

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
