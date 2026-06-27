-- ============================================================
-- Migration 000056: Add foreign key constraints to appointments
--
-- The appointments table was created without FK constraints,
-- causing PostgREST relationship resolution to fail silently
-- when clients query their appointments via the web app.
-- This migration:
--   1. Nullifies orphaned coach_id references (profile deleted)
--   2. Adds FK constraints so PostgREST can resolve joins
-- ============================================================

-- 1. Fix orphaned coach_id rows (profile no longer exists)
UPDATE public.appointments
SET coach_id = NULL
WHERE coach_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = appointments.coach_id
  );

-- 2. Add FK constraints (IF NOT EXISTS via DO block for safety)
DO $$
BEGIN
  -- client_id → profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'appointments_client_id_fkey'
      AND table_name = 'appointments'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- coach_id → profiles (nullable, ON DELETE SET NULL)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'appointments_coach_id_fkey'
      AND table_name = 'appointments'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_coach_id_fkey
      FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- tenant_id → tenants
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'appointments_tenant_id_fkey'
      AND table_name = 'appointments'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
