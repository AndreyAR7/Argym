-- Recurring weekly class schedule (e.g. "Ímpetu Metabolic", Mon/Wed/Fri
-- 6am, cap 12). Concrete bookable instances are generated into
-- `appointments` from these templates (see 000157).

CREATE TABLE public.class_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id         UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  coach_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  day_of_week       INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  max_participants  INT NOT NULL CHECK (max_participants > 0),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_class_templates_tenant_branch ON public.class_templates(tenant_id, branch_id);
CREATE INDEX idx_class_templates_active ON public.class_templates(tenant_id, is_active) WHERE is_active = TRUE;

ALTER TABLE public.class_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_templates_admin_all" ON public.class_templates
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('appointments.manage'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('appointments.manage'));

-- Coaches/clients need to browse active templates (e.g. to show upcoming
-- classes), but never edit them.
CREATE POLICY "class_templates_authenticated_read" ON public.class_templates
  FOR SELECT
  USING (tenant_id = public.get_tenant_id() AND is_active = TRUE);

CREATE TRIGGER set_class_templates_updated_at
  BEFORE UPDATE ON public.class_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Links a generated instance back to its template. NULL for ordinary 1:1
-- appointments and any other ad-hoc appointment.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS class_template_id UUID REFERENCES public.class_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_appointments_class_template ON public.appointments(class_template_id) WHERE class_template_id IS NOT NULL;
