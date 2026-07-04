-- Migration 000096: Admin notification broadcasts log
--
-- Records every bulk push notification sent by an admin from the web console.
-- This is separate from notification_queue (which handles system-triggered events)
-- because broadcasts target all users of a role, not individual users.

CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id)   ON DELETE CASCADE,
  sent_by      UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE SET NULL,
  title        TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  target_role  TEXT        NOT NULL DEFAULT 'all',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_tenant
  ON public.notification_broadcasts(tenant_id, created_at DESC);

ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

-- Admins can read all broadcasts for their tenant
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
         AND r.name IN ('admin', 'super_admin')
    )
  );

-- Admins can insert broadcasts for their own tenant
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
         AND r.name IN ('admin', 'super_admin')
    )
  );

GRANT SELECT, INSERT ON public.notification_broadcasts TO authenticated;
