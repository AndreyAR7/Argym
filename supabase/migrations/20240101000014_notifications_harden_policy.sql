-- ============================================================
-- Harden notifications INSERT policy
-- Only admins can insert notifications
-- ============================================================

DROP POLICY IF EXISTS "notifications_tenant_insert" ON public.notifications;

CREATE POLICY "notifications_admin_insert"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles ro ON ro.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.get_tenant_id()
        AND ro.name = 'admin'
    )
  );
  