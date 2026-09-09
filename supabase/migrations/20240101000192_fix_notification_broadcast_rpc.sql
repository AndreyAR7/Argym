-- notification_queue_admin_read and notification_broadcasts' read/insert
-- policies only checked role = 'admin' (one of them even checked
-- 'super_admin', a role that has never existed in this schema — roles
-- are admin/client/coach/full_access) — the same "role array missing
-- full_access" bug already found and fixed elsewhere this session. A
-- full_access user could read neither the notification queue nor the
-- broadcast history, and could not send a broadcast at all.

DROP POLICY IF EXISTS "notification_queue_admin_read" ON public.notification_queue;
CREATE POLICY "notification_queue_admin_read"
  ON public.notification_queue FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
       WHERE ur.user_id   = auth.uid()
         AND ur.tenant_id = public.get_tenant_id()
         AND r.name IN ('admin', 'full_access')
    )
  );

DROP POLICY IF EXISTS "notification_broadcasts_admin_read" ON public.notification_broadcasts;
CREATE POLICY "notification_broadcasts_admin_read"
  ON public.notification_broadcasts FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
       WHERE ur.user_id   = auth.uid()
         AND ur.tenant_id = public.get_tenant_id()
         AND r.name IN ('admin', 'full_access')
    )
  );

DROP POLICY IF EXISTS "notification_broadcasts_admin_insert" ON public.notification_broadcasts;
CREATE POLICY "notification_broadcasts_admin_insert"
  ON public.notification_broadcasts FOR INSERT
  WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND sent_by = auth.uid()
    AND EXISTS (
      SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
       WHERE ur.user_id   = auth.uid()
         AND ur.tenant_id = public.get_tenant_id()
         AND r.name IN ('admin', 'full_access')
    )
  );
