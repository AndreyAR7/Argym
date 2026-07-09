-- ─────────────────────────────────────────────────────────────────────────────
-- 000097 · Platform billing (ARGYM → gyms)
-- Stripe prices on subscription_plans, platform subscriptions management,
-- automatic tenant suspension cron job.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add Stripe identifiers to subscription_plans (platform plans only)
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id    TEXT,
  ADD COLUMN IF NOT EXISTS is_platform_plan   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_days         INTEGER NOT NULL DEFAULT 14;

-- RLS on tenant_subscriptions (previously unprotected)
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_all_tenant_subscriptions" ON public.tenant_subscriptions;
CREATE POLICY "superadmin_all_tenant_subscriptions"
  ON public.tenant_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "tenant_owner_read_own_subscription" ON public.tenant_subscriptions;
CREATE POLICY "tenant_owner_read_own_subscription"
  ON public.tenant_subscriptions
  FOR SELECT
  USING (tenant_id = public.get_tenant_id());

-- ── RPC: upsert_platform_subscription ───────────────────────────────────────
-- Called by the platform webhook on checkout.session.completed
CREATE OR REPLACE FUNCTION public.upsert_platform_subscription(
  p_tenant_id            UUID,
  p_plan_id              UUID,
  p_stripe_customer_id   TEXT,
  p_stripe_sub_id        TEXT,
  p_billing_cycle        TEXT,
  p_period_start         TIMESTAMPTZ,
  p_period_end           TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  INSERT INTO public.tenant_subscriptions (
    tenant_id, plan_id, stripe_customer_id, stripe_sub_id,
    billing_cycle, status, current_period_start, current_period_end
  ) VALUES (
    p_tenant_id, p_plan_id, p_stripe_customer_id, p_stripe_sub_id,
    p_billing_cycle, 'active', p_period_start, p_period_end
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    plan_id              = EXCLUDED.plan_id,
    stripe_customer_id   = EXCLUDED.stripe_customer_id,
    stripe_sub_id        = EXCLUDED.stripe_sub_id,
    billing_cycle        = EXCLUDED.billing_cycle,
    status               = 'active',
    current_period_start = EXCLUDED.current_period_start,
    current_period_end   = EXCLUDED.current_period_end,
    cancelled_at         = NULL,
    updated_at           = NOW()
  RETURNING id INTO v_sub_id;

  -- Ensure tenant is active on successful subscription
  UPDATE public.tenants SET is_active = TRUE WHERE id = p_tenant_id;

  RETURN v_sub_id;
END;
$$;

-- ── RPC: renew_platform_subscription ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.renew_platform_subscription(
  p_stripe_sub_id   TEXT,
  p_period_start    TIMESTAMPTZ,
  p_period_end      TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id   UUID;
  v_tenant_id UUID;
BEGIN
  SELECT id, tenant_id INTO v_sub_id, v_tenant_id
  FROM public.tenant_subscriptions
  WHERE stripe_sub_id = p_stripe_sub_id
  LIMIT 1;

  IF v_sub_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.tenant_subscriptions
  SET status               = 'active',
      current_period_start = p_period_start,
      current_period_end   = p_period_end,
      updated_at           = NOW()
  WHERE id = v_sub_id;

  UPDATE public.tenants SET is_active = TRUE WHERE id = v_tenant_id;

  RETURN v_sub_id;
END;
$$;

-- ── RPC: suspend_platform_subscription ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.suspend_platform_subscription(
  p_stripe_sub_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id    UUID;
  v_tenant_id UUID;
BEGIN
  SELECT id, tenant_id INTO v_sub_id, v_tenant_id
  FROM public.tenant_subscriptions
  WHERE stripe_sub_id = p_stripe_sub_id
  LIMIT 1;

  IF v_sub_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.tenant_subscriptions
  SET status = 'past_due', updated_at = NOW()
  WHERE id = v_sub_id;

  UPDATE public.tenants SET is_active = FALSE WHERE id = v_tenant_id;

  RETURN v_sub_id;
END;
$$;

-- ── RPC: cancel_platform_subscription ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_platform_subscription(
  p_stripe_sub_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id    UUID;
  v_tenant_id UUID;
BEGIN
  SELECT id, tenant_id INTO v_sub_id, v_tenant_id
  FROM public.tenant_subscriptions
  WHERE stripe_sub_id = p_stripe_sub_id
  LIMIT 1;

  IF v_sub_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.tenant_subscriptions
  SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
  WHERE id = v_sub_id;

  UPDATE public.tenants SET is_active = FALSE WHERE id = v_tenant_id;

  RETURN v_sub_id;
END;
$$;

-- ── pg_cron: auto-suspend past-due tenants ───────────────────────────────────
-- Runs daily at 06:00 UTC; suspends tenants whose platform subscription
-- ended more than 3 days ago without renewal.
SELECT cron.schedule(
  'suspend_overdue_platform_subscriptions',
  '0 6 * * *',
  $$
  UPDATE public.tenants t
  SET is_active = FALSE
  FROM public.tenant_subscriptions ts
  WHERE ts.tenant_id = t.id
    AND ts.status IN ('active', 'trialing')
    AND ts.current_period_end < NOW() - INTERVAL '3 days'
    AND t.is_active = TRUE;

  UPDATE public.tenant_subscriptions ts
  SET status = 'past_due', updated_at = NOW()
  FROM public.tenants t
  WHERE ts.tenant_id = t.id
    AND t.is_active = FALSE
    AND ts.status IN ('active', 'trialing')
    AND ts.current_period_end < NOW() - INTERVAL '3 days';
  $$
);

-- Unique constraint needed for ON CONFLICT in upsert_platform_subscription
ALTER TABLE public.tenant_subscriptions
  DROP CONSTRAINT IF EXISTS tenant_subscriptions_tenant_id_key;
ALTER TABLE public.tenant_subscriptions
  ADD CONSTRAINT tenant_subscriptions_tenant_id_key UNIQUE (tenant_id);
