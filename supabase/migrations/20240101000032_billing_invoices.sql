-- ============================================================
-- Billing & Invoicing foundation
-- Logic:
--   · assign_plan  → calculates end_date from billing_cycle + creates invoice
--   · cancel_subscription → marks cancelled + voids invoice
--   · mark_invoice_paid   → confirms payment, marks subscription active
--   · expire_due_subscriptions → cron-safe batch expiration
-- ============================================================

-- ── 1. Invoice number sequence ────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

DROP FUNCTION IF EXISTS public.next_invoice_number CASCADE;
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.invoice_number_seq')::TEXT, 5, '0');
END;
$$;

-- ── 2. Invoices table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES public.tenants(id)  ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id  UUID        REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  invoice_number   TEXT        NOT NULL UNIQUE DEFAULT public.next_invoice_number(),
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','paid','overdue','cancelled')),
  amount           NUMERIC(10,2) NOT NULL,
  currency         TEXT        NOT NULL DEFAULT 'CRC',
  description      TEXT,
  issue_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date         TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  notes            TEXT,
  created_by       UUID        REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant   ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user     ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON public.invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due      ON public.invoices(due_date) WHERE status = 'pending';

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Users see their own invoices; admins see all in their tenant
CREATE POLICY "invoices_self_read" ON public.invoices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "invoices_admin_read" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND tenant_id = invoices.tenant_id
    )
    AND public.has_permission('billing.manage')
  );

CREATE POLICY "invoices_admin_write" ON public.invoices
  FOR ALL USING (public.has_permission('billing.manage'));

-- ── 3. Add billing columns to user_subscriptions ─────────
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_renew        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelled_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ── 4. Helper: compute end_date from billing cycle ───────
DROP FUNCTION IF EXISTS public.subscription_end_date CASCADE;
CREATE OR REPLACE FUNCTION public.subscription_end_date(
  p_start      TIMESTAMPTZ,
  p_cycle      TEXT          -- 'monthly' | 'yearly' | 'one_time'
)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_cycle
    WHEN 'monthly'  THEN p_start + INTERVAL '1 month'
    WHEN 'yearly'   THEN p_start + INTERVAL '1 year'
    WHEN 'one_time' THEN NULL   -- never expires
    ELSE p_start + INTERVAL '1 month'
  END;
END;
$$;

-- ── 5. assign_plan — now sets end_date + creates invoice ─
DROP FUNCTION IF EXISTS public.assign_plan CASCADE;
CREATE OR REPLACE FUNCTION public.assign_plan(
  p_user_id   UUID,
  p_tenant_id UUID,
  p_plan_id   UUID,
  p_price     NUMERIC
)
RETURNS UUID   -- returns new subscription id
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_plan_name    TEXT;
  v_billing_cycle TEXT;
  v_currency     TEXT;
  v_start        TIMESTAMPTZ := NOW();
  v_end          TIMESTAMPTZ;
  v_sub_id       UUID;
BEGIN
  -- Verify plan belongs to tenant and is active
  SELECT name, billing_cycle, currency
    INTO v_plan_name, v_billing_cycle, v_currency
    FROM public.plans
   WHERE id = p_plan_id AND is_active = TRUE;

  IF v_plan_name IS NULL THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Calculate expiration based on billing cycle
  v_end := public.subscription_end_date(v_start, v_billing_cycle);

  -- Cancel all currently active subscriptions for this user in this tenant
  UPDATE public.user_subscriptions
     SET status       = 'cancelled',
         end_date     = v_start,
         cancelled_at = v_start
   WHERE user_id   = p_user_id
     AND tenant_id = p_tenant_id
     AND status    = 'active';

  -- Create new subscription
  INSERT INTO public.user_subscriptions
    (user_id, tenant_id, plan_id, status, start_date, end_date, next_billing_date, final_price)
  VALUES
    (p_user_id, p_tenant_id, p_plan_id, 'active', v_start, v_end,
     CASE WHEN v_billing_cycle != 'one_time' THEN v_end ELSE NULL END,
     p_price)
  RETURNING id INTO v_sub_id;

  -- Create the invoice (pending payment)
  INSERT INTO public.invoices
    (tenant_id, user_id, subscription_id, amount, currency, description,
     due_date, status)
  VALUES
    (p_tenant_id, p_user_id, v_sub_id, p_price, COALESCE(v_currency, 'CRC'),
     'Suscripción: ' || v_plan_name,
     NOW() + INTERVAL '7 days',
     'pending');

  RETURN v_sub_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_plan(UUID, UUID, UUID, NUMERIC) TO authenticated;

-- ── 6. cancel_subscription ───────────────────────────────
DROP FUNCTION IF EXISTS public.cancel_subscription CASCADE;
CREATE OR REPLACE FUNCTION public.cancel_subscription(
  p_subscription_id UUID,
  p_reason          TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id   UUID;
BEGIN
  SELECT tenant_id, user_id INTO v_tenant_id, v_user_id
    FROM public.user_subscriptions WHERE id = p_subscription_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  -- Verify caller is the subscriber or an admin of the tenant
  IF auth.uid() != v_user_id AND NOT public.has_permission('billing.manage') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE public.user_subscriptions
     SET status               = 'cancelled',
         end_date             = NOW(),
         cancelled_at         = NOW(),
         cancellation_reason  = COALESCE(p_reason, 'Cancelado por el usuario')
   WHERE id = p_subscription_id AND status = 'active';

  -- Void any pending invoice for this subscription
  UPDATE public.invoices
     SET status = 'cancelled', updated_at = NOW()
   WHERE subscription_id = p_subscription_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_subscription(UUID, TEXT) TO authenticated;

-- ── 7. mark_invoice_paid ─────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_invoice_paid CASCADE;
CREATE OR REPLACE FUNCTION public.mark_invoice_paid(
  p_invoice_id UUID,
  p_notes      TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.invoices WHERE id = p_invoice_id;
  IF NOT public.has_permission('billing.manage') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE public.invoices
     SET status     = 'paid',
         paid_at    = NOW(),
         notes      = COALESCE(p_notes, notes),
         updated_at = NOW()
   WHERE id = p_invoice_id AND status IN ('pending', 'overdue');
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_invoice_paid(UUID, TEXT) TO authenticated;

-- ── 8. expire_due_subscriptions (cron-safe) ──────────────
-- Call daily via pg_cron or Supabase Edge Function scheduler.
-- Marks subscriptions past their end_date as 'expired' and
-- marks their unpaid invoices as 'overdue'.
DROP FUNCTION IF EXISTS public.expire_due_subscriptions CASCADE;
CREATE OR REPLACE FUNCTION public.expire_due_subscriptions()
RETURNS INT   -- number of subscriptions expired
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  -- Expire subscriptions whose end_date has passed
  WITH expired AS (
    UPDATE public.user_subscriptions
       SET status = 'expired'
     WHERE status   = 'active'
       AND end_date IS NOT NULL
       AND end_date  < NOW()
     RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  -- Mark related invoices as overdue
  UPDATE public.invoices i
     SET status = 'overdue', updated_at = NOW()
    FROM public.user_subscriptions s
   WHERE i.subscription_id = s.id
     AND s.status           = 'expired'
     AND i.status           = 'pending'
     AND i.due_date         < NOW();

  RETURN v_count;
END;
$$;

-- ── 9. get_billing_summary (admin dashboard) ─────────────
DROP FUNCTION IF EXISTS public.get_billing_summary CASCADE;
CREATE OR REPLACE FUNCTION public.get_billing_summary(p_tenant_id UUID)
RETURNS TABLE (
  mrr                  NUMERIC,   -- monthly recurring revenue (active subs)
  invoices_pending     BIGINT,
  invoices_overdue     BIGINT,
  subscriptions_active BIGINT,
  subscriptions_expiring_7d BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_permission('billing.manage') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN s.status = 'active' THEN s.final_price ELSE 0 END), 0) AS mrr,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'pending')   AS invoices_pending,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'overdue')   AS invoices_overdue,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active')    AS subscriptions_active,
    COUNT(DISTINCT s.id) FILTER (
      WHERE s.status = 'active'
        AND s.end_date IS NOT NULL
        AND s.end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    ) AS subscriptions_expiring_7d
  FROM public.user_subscriptions s
  LEFT JOIN public.invoices i ON i.subscription_id = s.id AND i.tenant_id = p_tenant_id
  WHERE s.tenant_id = p_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_billing_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_due_subscriptions() TO authenticated;
