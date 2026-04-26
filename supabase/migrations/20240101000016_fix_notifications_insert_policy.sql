-- ============================================================
-- Fix notifications INSERT policy
--
-- Problem: previous policy used public.get_tenant_id() which
-- only checks the inserting user's tenant, but does NOT verify
-- that the destination user_id belongs to the same tenant.
-- This caused 42501 when inserting for client user_ids.
--
-- New policy: admin can insert for any user_id that belongs
-- to the same tenant as the row being inserted.
-- ============================================================

DROP POLICY IF EXISTS "notifications_admin_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_tenant_insert" ON public.notifications;

CREATE POLICY "notifications_admin_insert"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    -- Inserting user must be admin in the tenant of the new row
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles ro ON ro.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = notifications.tenant_id
        AND ro.name = 'admin'
    )
    AND
    -- Destination user_id must belong to the same tenant
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = notifications.user_id
        AND p.tenant_id = notifications.tenant_id
    )
  );
