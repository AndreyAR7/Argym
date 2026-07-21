-- ============================================================
-- Migration 000133: Fix 000132's suspend_lapsed_gym_memberships()
-- to only ever touch client accounts.
--
-- The original WHERE clause had no role filter at all: any profile
-- (client, coach, or admin) with a stale/expired physical-access
-- user_subscriptions row and no active replacement would be
-- suspended by the daily 4am cron. Staff accounts aren't supposed
-- to carry gym-membership subscriptions, but leftover rows from
-- before a promotion, or seed/test data, would silently lock a
-- coach or admin out of the app with no explanation.
--
-- No profiles have been suspended by this bug yet (suspended_at was
-- NULL for everyone at the time of this fix), so this is preventive,
-- not a data repair.
-- ============================================================

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
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = p.id
          AND ur.tenant_id = p.tenant_id
          AND r.name = 'client'
      )
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
