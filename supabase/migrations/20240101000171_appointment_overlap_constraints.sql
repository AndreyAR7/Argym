-- Real double-booking protection at the database level. Until now the only
-- guard against a coach/client having two overlapping appointments was
-- client-side (checkAppointmentConflicts + the DayPreviewStrip preview) —
-- advisory only. Two admins/coaches creating appointments at the same
-- moment could still both succeed, since nothing at the DB layer actually
-- enforced non-overlap. EXCLUDE USING gist is the correct Postgres
-- primitive for "no two rows may have the same coach/client AND an
-- overlapping time range" — btree_gist supplies the GiST operator class
-- needed for UUID equality alongside the range overlap check.
--
-- Both constraints exclude 'cancelled' appointments (a cancelled slot must
-- never block a new booking) and the client-side one additionally excludes
-- class instances (class_template_id IS NOT NULL) — group classes share
-- client_id = NULL, so it doesn't apply, and a client attending two
-- different classes that happen to overlap is a scheduling call for the
-- gym, not something this constraint should block.
--
-- Verified against production before writing this migration: no existing
-- coach or client currently has two overlapping non-cancelled appointments,
-- so this ALTER TABLE will not fail on current data.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  ADD CONSTRAINT no_overlapping_coach_appointments
  EXCLUDE USING gist (
    coach_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (coach_id IS NOT NULL AND status <> 'cancelled');

ALTER TABLE public.appointments
  ADD CONSTRAINT no_overlapping_client_appointments
  EXCLUDE USING gist (
    client_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (client_id IS NOT NULL AND class_template_id IS NULL AND status <> 'cancelled');
