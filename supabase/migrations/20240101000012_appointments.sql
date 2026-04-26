-- ============================================================
-- Appointments: RLS, policies, indexes, trigger
-- Safe to run on existing table — no CREATE TABLE
-- ============================================================

-- ── 1. Enable RLS (idempotent) ────────────────────────────────
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ── 2. Indexes (only if missing) ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_tenant
  ON public.appointments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_appointments_client
  ON public.appointments(client_id);

CREATE INDEX IF NOT EXISTS idx_appointments_coach
  ON public.appointments(coach_id);

CREATE INDEX IF NOT EXISTS idx_appointments_start
  ON public.appointments(start_time);

-- ── 3. Drop existing policies before recreating ──────────────
DROP POLICY IF EXISTS "appointments_admin_all"    ON public.appointments;
DROP POLICY IF EXISTS "appointments_coach_read"   ON public.appointments;
DROP POLICY IF EXISTS "appointments_coach_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_client_read"  ON public.appointments;

-- ── 4. Admin: full access within their tenant ────────────────
CREATE POLICY "appointments_admin_all"
  ON public.appointments
  FOR ALL
  USING (
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

-- ── 5. Coach: read and update their assigned appointments ─────
CREATE POLICY "appointments_coach_read"
  ON public.appointments
  FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND coach_id = auth.uid()
  );

CREATE POLICY "appointments_coach_update"
  ON public.appointments
  FOR UPDATE
  USING (
    tenant_id = public.get_tenant_id()
    AND coach_id = auth.uid()
  );

-- ── 6. Client: read only their own appointments ───────────────
CREATE POLICY "appointments_client_read"
  ON public.appointments
  FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND client_id = auth.uid()
  );

-- ── 7. set_updated_at function (CREATE OR REPLACE — safe) ─────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 8. Trigger (drop first to avoid duplicate) ───────────────
DROP TRIGGER IF EXISTS appointments_updated_at ON public.appointments;

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
