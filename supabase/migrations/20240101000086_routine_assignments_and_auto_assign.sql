-- ============================================================
-- Migration 000086: routine_assignments RLS + auto-assign
--
-- routine_assignments already exists (created outside migrations)
-- with column client_id (not user_id).  This migration:
--  1. Ensures RLS is enabled and adds policies.
--  2. Adds missing indexes.
--  3. Updates create_client_subscription to auto-assign plan routines.
-- ============================================================

-- ── 0. CREATE TABLE IF NOT EXISTS (was created outside migrations) ──────────
CREATE TABLE IF NOT EXISTS public.routine_assignments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (routine_id, client_id)
);

-- ── 1. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.routine_assignments ENABLE ROW LEVEL SECURITY;

-- Drop previous versions if they exist
DROP POLICY IF EXISTS ra_client_select ON public.routine_assignments;
DROP POLICY IF EXISTS ra_staff_all     ON public.routine_assignments;

-- Client: read their own assignments
CREATE POLICY ra_client_select ON public.routine_assignments
  FOR SELECT
  USING (client_id = auth.uid());

-- Staff (admin/coach): full access within their tenant
CREATE POLICY ra_staff_all ON public.routine_assignments
  FOR ALL
  USING (public.has_permission('clients.manage'))
  WITH CHECK (public.has_permission('clients.manage'));

-- ── 2. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_routine_assignments_client
  ON public.routine_assignments(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_routine_assignments_routine
  ON public.routine_assignments(routine_id);

-- ── 3. Updated create_client_subscription RPC ───────────────────────────────
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
  RETURNING id INTO v_sub_id;

  -- Auto-assign routines linked to the plan
  INSERT INTO public.routine_assignments (routine_id, client_id, tenant_id)
  SELECT pr.routine_id, p_user_id, p_tenant_id
  FROM public.plan_routines pr
  WHERE pr.plan_id = p_plan_id
  ON CONFLICT DO NOTHING;

  -- Auto-assign routines linked to the promotion (if any)
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
