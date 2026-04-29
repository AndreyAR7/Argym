-- ============================================================
-- Fix 1: Users can hold multiple concurrent active subscriptions.
--   Remove the block that cancelled all existing subs when a
--   new plan was assigned.  Expiration is enforced by end_date
--   (expire_due_subscriptions cron) — not by mutual exclusion.
--
-- Fix 2: Free/hook videos — any video can be marked is_free=true
--   to be accessible without a subscription (e.g. teasers).
-- ============================================================

-- ── Fix 2: free video flag ────────────────────────────────────
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_videos_free ON public.videos(tenant_id) WHERE is_free = TRUE;

-- ── Fix 1: updated assign_plan ────────────────────────────────
-- No longer cancels existing active subscriptions.
-- Each call creates one new subscription.  Users keep all plans
-- until their end_date passes.
CREATE OR REPLACE FUNCTION public.assign_plan(
  p_user_id   UUID,
  p_tenant_id UUID,
  p_plan_id   UUID,
  p_price     NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_plan_name     TEXT;
  v_billing_cycle TEXT;
  v_currency      TEXT;
  v_start         TIMESTAMPTZ := NOW();
  v_end           TIMESTAMPTZ;
  v_sub_id        UUID;
BEGIN
  SELECT name, billing_cycle, currency
    INTO v_plan_name, v_billing_cycle, v_currency
    FROM public.plans
   WHERE id = p_plan_id AND is_active = TRUE;

  IF v_plan_name IS NULL THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  v_end := public.subscription_end_date(v_start, v_billing_cycle);

  -- Users can hold multiple concurrent plans — no cancellation of existing ones.

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

GRANT EXECUTE ON FUNCTION public.assign_plan(UUID, UUID, UUID, NUMERIC) TO authenticated;
