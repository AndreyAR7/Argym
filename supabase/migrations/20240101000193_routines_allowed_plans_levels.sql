-- Both the web (RoutineFormModal) and mobile ((admin)/content.tsx) admin
-- routine forms already have fully-built "Planes permitidos" / "Niveles
-- permitidos" selectors, and createRoutineAction/cloneRoutineAction/
-- createRoutine (mobile) all send allowed_plans/allowed_levels on every
-- insert — but the routines table never actually got these columns in
-- any migration (they were only ever added to videos, which routines'
-- content-gating UI was modeled after). Every routine create/clone/edit
-- has been failing with "column allowed_levels does not exist" since
-- that UI shipped. Mirrors videos' exact column definition — same type,
-- default, and index — since mobile's fetchClientRoutines already
-- assumes this exact empty-array-means-all-levels/plans semantics.

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS allowed_plans  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_levels TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_routines_levels ON public.routines USING GIN (allowed_levels);
CREATE INDEX IF NOT EXISTS idx_routines_plans  ON public.routines USING GIN (allowed_plans);
