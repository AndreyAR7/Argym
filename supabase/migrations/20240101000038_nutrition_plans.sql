-- ============================================================
-- Nutrition module: plans and direct client assignments
-- ============================================================

-- ── nutrition_plans ───────────────────────────────────────────
CREATE TABLE public.nutrition_plans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  calories_target INT,
  protein_g       INT,
  carbs_g         INT,
  fat_g           INT,
  goal            TEXT,
  status          TEXT        NOT NULL DEFAULT 'draft',
  is_template     BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nutrition_status_check CHECK (status IN ('draft','published','archived'))
);

CREATE INDEX idx_nutrition_plans_tenant  ON public.nutrition_plans(tenant_id);
CREATE INDEX idx_nutrition_plans_status  ON public.nutrition_plans(tenant_id, status);

ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutrition_plans_tenant_read" ON public.nutrition_plans
  FOR SELECT USING (tenant_id = public.get_tenant_id());

CREATE POLICY "nutrition_plans_staff_write" ON public.nutrition_plans
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('routines.create')
  );

-- ── nutrition_assignments ─────────────────────────────────────
CREATE TABLE public.nutrition_assignments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrition_plan_id   UUID        NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  client_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id           UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_by         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note                TEXT,
  UNIQUE (nutrition_plan_id, client_id)
);

CREATE INDEX idx_nutrition_assign_client ON public.nutrition_assignments(client_id, tenant_id);
CREATE INDEX idx_nutrition_assign_plan   ON public.nutrition_assignments(nutrition_plan_id);
CREATE INDEX idx_nutrition_assign_tenant ON public.nutrition_assignments(tenant_id);

ALTER TABLE public.nutrition_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutrition_assign_read" ON public.nutrition_assignments
  FOR SELECT USING (
    client_id = auth.uid()
    OR (tenant_id = public.get_tenant_id() AND public.has_permission('routines.create'))
  );

CREATE POLICY "nutrition_assign_staff_write" ON public.nutrition_assignments
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('routines.create')
  );
