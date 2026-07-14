-- ============================================================
-- Migration 000078: Security hardening
--
-- Fixes:
-- 1. get_tenant_id() and has_permission() raise exception on NULL auth.uid()
--    instead of silently returning NULL
-- 2. notifications INSERT policy validates user_id belongs to caller's tenant
-- 3. Remove permissive user_subscriptions self-insert policy
--    (subscriptions must only be created via create_client_subscription() RPC)
-- 4. email_logs read restricted to communications.manage permission
-- ============================================================

-- ── 1. Harden get_tenant_id() ─────────────────────────────────
DROP FUNCTION IF EXISTS public.get_tenant_id CASCADE;
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_uid UUID;
  v_tid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'get_tenant_id: caller must be authenticated';
  END IF;
  SELECT tenant_id INTO v_tid FROM public.profiles WHERE id = v_uid;
  RETURN v_tid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth;

-- ── 2. Harden has_permission() ───────────────────────────────
-- NOTE: parameter name must match the existing function signature (permission_code)
DROP FUNCTION IF EXISTS public.has_permission CASCADE;
CREATE OR REPLACE FUNCTION public.has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = v_uid
      AND p.name = permission_code
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth;

-- ── 3. Fix notifications INSERT — validate user_id belongs to tenant ─
DO $$
BEGIN
  -- Drop existing policy if present to replace it
  DROP POLICY IF EXISTS "notifications_admin_insert" ON public.notifications;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'notifications_admin_insert_v2'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "notifications_admin_insert_v2" ON public.notifications
        FOR INSERT
        WITH CHECK (
          tenant_id = public.get_tenant_id()
          AND public.has_permission('notifications.send')
          AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = notifications.user_id
              AND tenant_id = public.get_tenant_id()
          )
        )
    $pol$;
  END IF;
END $$;

-- ── 4. Remove self-insert on user_subscriptions ───────────────
-- Subscriptions must only be created via create_client_subscription() RPC
-- which is called exclusively from the Stripe webhook after payment verification.
DROP POLICY IF EXISTS "subscriptions_insert" ON public.user_subscriptions;

-- ── 5. Restrict email_logs to staff with communications.manage ─
DO $$
BEGIN
  DROP POLICY IF EXISTS "email_logs_admin_read" ON public.email_logs;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'email_logs' AND policyname = 'email_logs_staff_read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "email_logs_staff_read" ON public.email_logs
        FOR SELECT USING (
          tenant_id = public.get_tenant_id()
          AND public.has_permission('communications.manage')
        )
    $pol$;
  END IF;
END $$;
