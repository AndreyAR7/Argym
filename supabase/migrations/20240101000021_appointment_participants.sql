-- ── appointment_participants: support for group appointments ──

-- 1. Add group_mode to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS group_mode TEXT DEFAULT 'individual'
    CHECK (group_mode IN ('individual', 'group'));

-- 2. Participants table
CREATE TABLE IF NOT EXISTS public.appointment_participants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_participants_unique
  ON public.appointment_participants (appointment_id, user_id);

CREATE INDEX IF NOT EXISTS idx_appointment_participants_apt
  ON public.appointment_participants (appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_participants_user
  ON public.appointment_participants (user_id);

-- 3. RLS
ALTER TABLE public.appointment_participants ENABLE ROW LEVEL SECURITY;

-- Admin: full access within tenant
CREATE POLICY "apt_participants_admin_all"
  ON public.appointment_participants FOR ALL
  USING (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles ro ON ro.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.get_tenant_id()
        AND ro.name = 'admin'
    )
  );

-- Client/coach: read their own participations
CREATE POLICY "apt_participants_self_read"
  ON public.appointment_participants FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND user_id = auth.uid()
  );
