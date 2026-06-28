-- ============================================================
-- Migration 000081: Body measurements module
--
-- 1. Add gender column to profiles
-- 2. Create body_measurements table (first use in codebase)
-- 3. RLS policies + indexes
-- ============================================================

-- ── 1. Gender on profiles ─────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IN ('male', 'female', 'other'));

-- ── 2. Body measurements table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  measured_at     DATE        NOT NULL DEFAULT CURRENT_DATE,
  weight_kg       NUMERIC(5,2),
  height_cm       NUMERIC(5,1),
  body_fat_pct    NUMERIC(4,1),
  muscle_mass_kg  NUMERIC(5,2),
  neck_cm         NUMERIC(5,1),
  shoulder_cm     NUMERIC(5,1),
  chest_cm        NUMERIC(5,1),
  waist_cm        NUMERIC(5,1),
  abdomen_cm      NUMERIC(5,1),
  hip_cm          NUMERIC(5,1),
  arm_cm          NUMERIC(5,1),
  thigh_cm        NUMERIC(5,1),
  calf_cm         NUMERIC(5,1),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, measured_at)
);

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Client: own data
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_measurements' AND policyname = 'bm_client_select') THEN
    CREATE POLICY "bm_client_select" ON public.body_measurements
      FOR SELECT USING (client_id = auth.uid() AND tenant_id = public.get_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_measurements' AND policyname = 'bm_client_insert') THEN
    CREATE POLICY "bm_client_insert" ON public.body_measurements
      FOR INSERT WITH CHECK (client_id = auth.uid() AND tenant_id = public.get_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_measurements' AND policyname = 'bm_client_update') THEN
    CREATE POLICY "bm_client_update" ON public.body_measurements
      FOR UPDATE USING (client_id = auth.uid() AND tenant_id = public.get_tenant_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_measurements' AND policyname = 'bm_client_delete') THEN
    CREATE POLICY "bm_client_delete" ON public.body_measurements
      FOR DELETE USING (client_id = auth.uid() AND tenant_id = public.get_tenant_id());
  END IF;

  -- Coach/admin: view all tenant measurements with progress.view permission
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_measurements' AND policyname = 'bm_staff_select') THEN
    CREATE POLICY "bm_staff_select" ON public.body_measurements
      FOR SELECT USING (
        tenant_id = public.get_tenant_id()
        AND public.has_permission('progress.view')
      );
  END IF;
END $$;

-- ── 4. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bm_client_date
  ON public.body_measurements(client_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_bm_tenant
  ON public.body_measurements(tenant_id);

-- ── 5. updated_at trigger ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_bm_updated_at'
      AND tgrelid = 'public.body_measurements'::regclass
  ) THEN
    CREATE TRIGGER trg_bm_updated_at
      BEFORE UPDATE ON public.body_measurements
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- set_updated_at() not defined; skip trigger
  NULL;
END $$;
