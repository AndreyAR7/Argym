-- ============================================================
-- In-app notifications system
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL,   -- appointment_created | appointment_cancelled | appointment_completed
  title                TEXT NOT NULL,
  message              TEXT NOT NULL,
  related_entity_type  TEXT,            -- 'appointment'
  related_entity_id    UUID,
  is_read              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant  ON public.notifications(tenant_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_own_read"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "notifications_own_update"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Any authenticated user in the tenant can insert notifications
-- (needed so admin can create notifications for clients/coaches)
CREATE POLICY "notifications_tenant_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (tenant_id = public.get_tenant_id());
