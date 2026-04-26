-- ============================================================
-- Extend appointments table: type, location, meeting_url, notes
-- Safe to run on existing data — ADD COLUMN IF NOT EXISTS
-- ============================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_type TEXT DEFAULT 'in_person'
    CHECK (appointment_type IN ('in_person', 'virtual'));

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS meeting_url TEXT;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS notes TEXT;
