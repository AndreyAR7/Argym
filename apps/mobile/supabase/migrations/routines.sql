-- ═══════════════════════════════════════════════════════════════
-- ROUTINES MODULE — Full SaaS migration
-- ═══════════════════════════════════════════════════════════════

-- ── 1. ENUMS ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE exercise_muscle AS ENUM (
    'Pecho','Espalda','Hombros','Bíceps','Tríceps',
    'Piernas','Glúteos','Core','Cardio','General'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE routine_level AS ENUM ('beginner','intermediate','advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. ROUTINES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  level        routine_level NOT NULL DEFAULT 'beginner',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  is_template  BOOLEAN NOT NULL DEFAULT false,  -- reusable template
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. EXERCISES (belong to a routine) ──────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id   UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  muscle       exercise_muscle NOT NULL DEFAULT 'General',
  sets         INTEGER NOT NULL DEFAULT 3,
  reps         INTEGER NOT NULL DEFAULT 10,
  rest_seconds INTEGER NOT NULL DEFAULT 60,
  notes        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

-- ── 4. ROUTINE ASSIGNMENTS (routine → client) ────────────────────
CREATE TABLE IF NOT EXISTS routine_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id  UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(routine_id, client_id)
);

-- ── 5. EXERCISE PROGRESS (client marks exercises done) ───────────
CREATE TABLE IF NOT EXISTS exercise_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id   UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(exercise_id, client_id, session_date)
);

-- ── 6. INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_routines_tenant    ON routines(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_exercises_routine  ON exercises(routine_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_routine_assign_client ON routine_assignments(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_exercise_progress_client ON exercise_progress(client_id, session_date);

-- ── 7. UPDATED_AT TRIGGER ────────────────────────────────────────
DROP TRIGGER IF EXISTS routines_updated_at ON routines;
CREATE TRIGGER routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 8. RLS ───────────────────────────────────────────────────────
ALTER TABLE routines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_progress  ENABLE ROW LEVEL SECURITY;

-- Staff manages routines in their tenant
CREATE POLICY "staff_all_routines" ON routines
  FOR ALL USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id))
  WITH CHECK (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));

-- Clients read active routines assigned to them
CREATE POLICY "client_read_assigned_routines" ON routines
  FOR SELECT USING (
    is_active = true AND tenant_id = my_tenant_id() AND
    EXISTS (SELECT 1 FROM routine_assignments ra WHERE ra.routine_id = id AND ra.client_id = auth.uid())
  );

-- Staff manages exercises
CREATE POLICY "staff_all_exercises" ON exercises
  FOR ALL USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id))
  WITH CHECK (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));

-- Clients read exercises of their assigned routines
CREATE POLICY "client_read_exercises" ON exercises
  FOR SELECT USING (
    tenant_id = my_tenant_id() AND
    EXISTS (SELECT 1 FROM routine_assignments ra WHERE ra.routine_id = routine_id AND ra.client_id = auth.uid())
  );

-- Staff manages assignments
CREATE POLICY "staff_manage_routine_assignments" ON routine_assignments
  FOR ALL USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id))
  WITH CHECK (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));

-- Clients read their own assignments
CREATE POLICY "client_read_own_routine_assignments" ON routine_assignments
  FOR SELECT USING (client_id = auth.uid() AND tenant_id = my_tenant_id());

-- Clients manage their own progress
CREATE POLICY "client_own_exercise_progress" ON exercise_progress
  FOR ALL USING (client_id = auth.uid() AND tenant_id = my_tenant_id())
  WITH CHECK (client_id = auth.uid() AND tenant_id = my_tenant_id());

-- Staff reads progress for analytics
CREATE POLICY "staff_read_exercise_progress" ON exercise_progress
  FOR SELECT USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));
