-- ============================================================
-- updated_at triggers for key tables + composite index on appointments
-- ============================================================

-- 1. Shared trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. nutrition_plans
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_updated_at_nutrition_plans'
      AND tgrelid = 'public.nutrition_plans'::regclass
  ) THEN
    CREATE TRIGGER trg_set_updated_at_nutrition_plans
      BEFORE UPDATE ON public.nutrition_plans
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 3. videos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_updated_at_videos'
      AND tgrelid = 'public.videos'::regclass
  ) THEN
    CREATE TRIGGER trg_set_updated_at_videos
      BEFORE UPDATE ON public.videos
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 4. routines
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_updated_at_routines'
      AND tgrelid = 'public.routines'::regclass
  ) THEN
    CREATE TRIGGER trg_set_updated_at_routines
      BEFORE UPDATE ON public.routines
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 5. exercises
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_updated_at_exercises'
      AND tgrelid = 'public.exercises'::regclass
  ) THEN
    CREATE TRIGGER trg_set_updated_at_exercises
      BEFORE UPDATE ON public.exercises
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 6. nutrition_assignments (only if updated_at column exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'nutrition_assignments'
      AND column_name  = 'updated_at'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_set_updated_at_nutrition_assignments'
        AND tgrelid = 'public.nutrition_assignments'::regclass
    ) THEN
      CREATE TRIGGER trg_set_updated_at_nutrition_assignments
        BEFORE UPDATE ON public.nutrition_assignments
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;

-- 7. Composite index on appointments
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status_start
  ON public.appointments(tenant_id, status, start_at);
