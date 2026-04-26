-- ============================================================
-- Fix notifications INSERT policy
--
-- Root cause: public.get_tenant_id() is STABLE and may be
-- cached incorrectly during multi-row inserts. Replace with
-- a direct inline subquery that evaluates fresh per row.
--
-- New policy: admin can insert notifications for any user
-- within their own tenant. The check verifies:
--   1. The inserting user is an admin (via user_roles)
--   2. The tenant_id in the row matches the admin's tenant
-- ============================================================

DROP POLICY IF EXISTS "notifications_admin_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_tenant_insert" ON public.notifications;

CREATE POLICY "notifications_admin_insert"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    -- The row's tenant_id must match the inserting admin's tenant
    tenant_id = (
      SELECT p.tenant_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1
    )
    AND
    -- The inserting user must have the admin role in that tenant
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles ro ON ro.id = ur.role_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = p.tenant_id
        AND ro.name = 'admin'
    )
  );

-- ── Diagnostic queries (run in SQL Editor to verify) ─────────
-- 1. Check all policies on notifications:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies WHERE tablename = 'notifications';
--
-- 2. Check if admin has role (replace with real admin UUID):
-- SELECT ur.user_id, ro.name, ur.tenant_id
-- FROM public.user_roles ur
-- JOIN public.roles ro ON ro.id = ur.role_id
-- WHERE ur.user_id = '47257faa-8ede-4557-9ef3-5a1faee28f36';
--
-- 3. Check what get_tenant_id() returns for admin:
-- SELECT public.get_tenant_id();  -- run as admin user via anon key
--
-- 4. Verify notifications after fix:
-- SELECT id, user_id, title, is_read, created_at
-- FROM public.notifications ORDER BY created_at DESC LIMIT 20;
