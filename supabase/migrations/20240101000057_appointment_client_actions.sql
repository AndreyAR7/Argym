-- ============================================================
-- Migration 000057: Client appointment actions
--
-- 1. Add 'pending_confirmation' and 'postpone_requested' to
--    appointment_status enum
-- 2. Update client RLS to allow 'postpone_requested'
-- 3. SECURITY DEFINER helper to get admin IDs for a tenant
--    (used by client server actions to send push notifications)
-- ============================================================

-- 1. Add enum values (safe — IF NOT EXISTS)
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'pending_confirmation';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'postpone_requested';

-- 2. Update client update policy
-- Use status::text cast to avoid "unsafe use of new enum value in same transaction"
DROP POLICY IF EXISTS "appointments_client_update" ON public.appointments;

CREATE POLICY "appointments_client_update"
  ON public.appointments
  FOR UPDATE
  USING (
    tenant_id = public.get_tenant_id()
    AND client_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND client_id = auth.uid()
    AND status::text IN ('confirmed', 'cancelled', 'postpone_requested')
  );

-- 3. Return all admin user_ids for the calling user's tenant
--    SECURITY DEFINER so a client JWT can safely invoke it.
DROP FUNCTION IF EXISTS public.get_tenant_admin_ids CASCADE;
CREATE OR REPLACE FUNCTION public.get_tenant_admin_ids()
RETURNS UUID[]
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_id      UUID;
  v_admin_role_id  UUID;
BEGIN
  v_tenant_id := public.get_tenant_id();
  IF v_tenant_id IS NULL THEN RETURN '{}'; END IF;

  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
  IF v_admin_role_id IS NULL THEN RETURN '{}'; END IF;

  RETURN ARRAY(
    SELECT user_id FROM user_roles
    WHERE tenant_id = v_tenant_id
      AND role_id   = v_admin_role_id
  );
END;
$$;
