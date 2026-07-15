-- ============================================================
-- Migration 000112: Fix missing triggers dropped by earlier
-- `DROP FUNCTION ... CASCADE` migrations and never recreated.
--
-- CRITICAL: on_auth_user_created (AFTER INSERT ON auth.users, calls
-- handle_new_user()) was dropped by migration 000084's
-- `DROP FUNCTION public.handle_new_user CASCADE` and never recreated.
-- Since then, every new self-registration via supabase.auth.signUp()
-- has created an auth.users row with NO corresponding profiles row —
-- the account exists but is permanently unusable, and the email can
-- never be used to register again ("already registered"). This is the
-- same class of bug found in migration 000111 for the communication
-- triggers, just on the registration path this time.
--
-- LOW SEVERITY: appointments_updated_at (created in 000012) was
-- collateral damage of 000039's `DROP FUNCTION public.set_updated_at
-- CASCADE` and never recreated — appointments.updated_at has not been
-- auto-refreshing on UPDATE. trg_set_updated_at_routines/_exercises/
-- _nutrition_assignments were guarded by `IF EXISTS (table)` checks in
-- 000039 that ran BEFORE those tables existed (routines/exercises
-- created in 000075, nutrition_assignments earlier) — the guards never
-- fired, so those triggers were never created at all in any project.
-- ============================================================

-- ── Critical: reattach the new-user registration trigger ────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Low severity: reattach/backfill updated_at triggers ──────────────────
DROP TRIGGER IF EXISTS appointments_updated_at ON public.appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routines') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_set_updated_at_routines'
        AND tgrelid = 'public.routines'::regclass
    ) THEN
      CREATE TRIGGER trg_set_updated_at_routines
        BEFORE UPDATE ON public.routines
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exercises') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_set_updated_at_exercises'
        AND tgrelid = 'public.exercises'::regclass
    ) THEN
      CREATE TRIGGER trg_set_updated_at_exercises
        BEFORE UPDATE ON public.exercises
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END $$;

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
