-- The entire "exercises within a routine" feature — admin/coach routine
-- list ("N ejercicios" count + the exercises(count) PostgREST embed),
-- the admin routine detail page's exercise CRUD, the client routine
-- player, and daily exercise-completion tracking — has been completely
-- broken since it shipped: `exercises` and `exercise_progress` are
-- referenced everywhere across web AND mobile (routine_id/tenant_id/
-- name/muscle/sets/reps/rest_seconds/notes/sort_order/demo_video_* on
-- exercises; routine_id/exercise_id/client_id/completed/session_date on
-- exercise_progress) but neither table was ever created in any
-- migration. Migration 000039 even tried to conditionally create an
-- updated_at trigger for `exercises` guarded by "IF EXISTS (table)" —
-- the table didn't exist at that point either, so the guard silently
-- skipped it and no one ever came back to actually create the table.
--
-- Concrete symptom that surfaced this: PostgREST's `exercises(count)`
-- embed on the admin/coach routines list pages errors with "Could not
-- find a relationship between 'routines' and 'exercises'" (PGRST200) —
-- the list pages don't check that query's error, so `.data` comes back
-- undefined and the page always renders "No hay rutinas", regardless of
-- how many routines actually exist.

CREATE TABLE public.exercises (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id               UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  tenant_id                UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  muscle                   TEXT,
  sets                     INT NOT NULL DEFAULT 3,
  reps                     INT NOT NULL DEFAULT 10,
  rest_seconds             INT NOT NULL DEFAULT 60,
  notes                    TEXT,
  sort_order               INT NOT NULL DEFAULT 0,
  demo_video_storage_path  TEXT,
  demo_video_bucket        TEXT DEFAULT 'videos',
  demo_video_mime_type     TEXT,
  demo_duration_seconds    INT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_routine ON public.exercises(routine_id, sort_order);
CREATE INDEX idx_exercises_tenant  ON public.exercises(tenant_id);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_tenant_read" ON public.exercises
  FOR SELECT USING (tenant_id = public.get_tenant_id());

-- Same permission that already gates writes on routines themselves
-- (routines_admin_write) — whoever can create/edit a routine can manage
-- its exercises.
CREATE POLICY "exercises_admin_write" ON public.exercises
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'));

CREATE TRIGGER trg_set_updated_at_exercises
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Daily per-client exercise completion tracking ───────────────────────
CREATE TABLE public.exercise_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id   UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  exercise_id  UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  session_date DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exercise_id, client_id, session_date)
);

CREATE INDEX idx_exercise_progress_client ON public.exercise_progress(client_id, session_date DESC);
CREATE INDEX idx_exercise_progress_tenant ON public.exercise_progress(tenant_id);

ALTER TABLE public.exercise_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_progress_own" ON public.exercise_progress
  FOR ALL
  USING (client_id = auth.uid() AND tenant_id = public.get_tenant_id())
  WITH CHECK (client_id = auth.uid() AND tenant_id = public.get_tenant_id());

-- progress.view already exists and is granted to admin/full_access/coach
-- (added this session for the same body_measurements staff-read need).
CREATE POLICY "exercise_progress_staff_read" ON public.exercise_progress
  FOR SELECT
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('progress.view'));
