-- ============================================================
-- Migration 000132: Auto-suspend accounts on lapsed, unpaid
-- physical-access gym memberships (grace period, non-destructive).
--
-- expire_due_subscriptions() (20240101000032) already flips a
-- subscription to 'expired' once end_date passes, and
-- award_gym_checkin() (20240101000114) already refuses physical
-- check-in once status != 'active'. The gap this migration closes
-- is account/login-level: after a 3-day grace period past expiry,
-- the profile itself is suspended (is_active = FALSE) so the client
-- can no longer log into the app at all — without deleting the
-- account. Admins reactivate manually via record_manual_subscription_payment
-- once a cash/transfer payment is confirmed out-of-band.
-- ============================================================

-- ── 1. Suspension metadata on profiles ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ NULL;

-- ── 2. Cron-safe suspension sweep ─────────────────────────────
-- Only targets profiles whose *physical-access* membership expired
-- more than 3 days ago and who have no other active physical-access
-- subscription (i.e. they haven't already renewed). Idempotent: once
-- is_active flips to FALSE the profile drops out of the WHERE clause,
-- so no separate "already processed" marker is needed.
DROP FUNCTION IF EXISTS public.suspend_lapsed_gym_memberships CASCADE;

CREATE OR REPLACE FUNCTION public.suspend_lapsed_gym_memberships()
RETURNS INT   -- number of profiles suspended
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count      INT;
  v_ids        UUID[];
  v_tenant_ids UUID[];
BEGIN
  WITH suspended AS (
    UPDATE public.profiles p
    SET is_active         = FALSE,
        suspension_reason = 'non_payment',
        suspended_at      = NOW()
    WHERE p.is_active = TRUE
      AND p.approval_status = 'approved'
      AND EXISTS (
        SELECT 1 FROM public.user_subscriptions us
        JOIN public.plans pl ON pl.id = us.plan_id
        WHERE us.user_id = p.id
          AND pl.grants_physical_access = TRUE
          AND us.status = 'expired'
          AND us.end_date < NOW() - INTERVAL '3 days'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_subscriptions us2
        JOIN public.plans pl2 ON pl2.id = us2.plan_id
        WHERE us2.user_id = p.id
          AND pl2.grants_physical_access = TRUE
          AND us2.status = 'active'
      )
    RETURNING p.id, p.tenant_id
  )
  SELECT array_agg(id), array_agg(tenant_id) INTO v_ids, v_tenant_ids FROM suspended;

  v_count := COALESCE(array_length(v_ids, 1), 0);

  -- In-app bell notification per suspended user (best-effort — never
  -- block the suspension sweep if the notification insert fails).
  IF v_count > 0 THEN
    BEGIN
      INSERT INTO public.notifications (user_id, tenant_id, type, title, message)
      SELECT unnest(v_ids), unnest(v_tenant_ids), 'membership_suspended',
             'Cuenta suspendida',
             'Tu membresía venció sin pago y tu cuenta fue suspendida. Contacta a tu gimnasio para reactivarla.';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN v_count;
END;
$$;

SELECT cron.schedule(
  'suspend-lapsed-gym-memberships',
  '0 4 * * *',
  $$SELECT public.suspend_lapsed_gym_memberships()$$
);

-- ── 3. Admin-triggered manual payment recording (cash/transfer) ──
-- Restores physical access (not just login) by reviving the actual
-- subscription — mirrors renew_client_subscription's extend logic,
-- but is admin-invoked rather than Stripe-webhook-invoked, and also
-- leaves a paid invoice behind for bookkeeping.
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

  IF NOT public.has_permission('billing.manage') THEN
    RAISE EXCEPTION 'Insufficient permissions';
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

GRANT EXECUTE ON FUNCTION public.record_manual_subscription_payment(UUID, INT) TO authenticated;
