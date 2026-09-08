-- Admin-created blackout windows so a coach or branch can't be double-booked
-- on top of vacations, maintenance, private events, etc. Purely additive:
-- the booking UI/RPCs are responsible for checking these before allowing a
-- new appointment/class-spot request (enforced app-side in this pass, same
-- as every other overlap concern in this system today).

CREATE TABLE public.schedule_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  coach_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  reason      TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time),
  CHECK (branch_id IS NOT NULL OR coach_id IS NOT NULL)
);

CREATE INDEX idx_schedule_blocks_branch ON public.schedule_blocks(branch_id, start_time) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_schedule_blocks_coach  ON public.schedule_blocks(coach_id, start_time)  WHERE coach_id IS NOT NULL;

ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_blocks_admin_all" ON public.schedule_blocks
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('appointments.manage'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('appointments.manage'));

CREATE POLICY "schedule_blocks_coach_read" ON public.schedule_blocks
  FOR SELECT
  USING (tenant_id = public.get_tenant_id() AND coach_id = auth.uid());
