-- ============================================================
-- Migration 000087: coach_client_assignments
--
-- Explicit many-to-many between coaches and clients.
-- - A coach belongs to a branch (profiles.branch_id).
-- - Admin assigns clients (from that branch) to a coach.
-- - Same client can be assigned to multiple coaches (UNIQUE per pair).
-- - Replaces the implicit appointments-based "coach sees clients" logic.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coach_client_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id)  ON DELETE CASCADE,
  assigned_by UUID        REFERENCES public.profiles(id)          ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coach_id, client_id)
);

ALTER TABLE public.coach_client_assignments ENABLE ROW LEVEL SECURITY;

-- Coach: read their own assignments
CREATE POLICY cca_coach_select ON public.coach_client_assignments
  FOR SELECT
  USING (coach_id = auth.uid());

-- Admin/coach manager: full access within their tenant
CREATE POLICY cca_staff_all ON public.coach_client_assignments
  FOR ALL
  USING (public.has_permission('clients.manage'))
  WITH CHECK (public.has_permission('clients.manage'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cca_coach   ON public.coach_client_assignments(coach_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_cca_client  ON public.coach_client_assignments(client_id, tenant_id);
