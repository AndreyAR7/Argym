-- Foundation for group classes with a fixed capacity: per-tenant settings
-- (grace period before auto-cancelling an unconfirmed request, default
-- class capacity), a branch reference on appointments (didn't exist —
-- needed to scope classes/blocks to a physical location), and a capacity
-- column. class_id/class_template_id wiring comes in later migrations.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS appointment_grace_hours NUMERIC NOT NULL DEFAULT 2
    CHECK (appointment_grace_hours > 0),
  ADD COLUMN IF NOT EXISTS default_class_capacity INT NOT NULL DEFAULT 12
    CHECK (default_class_capacity > 0);

COMMENT ON COLUMN public.tenants.appointment_grace_hours IS
  'Hours before an appointment/class start time by which a pending_confirmation request must be approved, or it is auto-cancelled.';
COMMENT ON COLUMN public.tenants.default_class_capacity IS
  'Default max_participants suggested when creating a new class template.';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_participants INT NULL CHECK (max_participants IS NULL OR max_participants > 0);

COMMENT ON COLUMN public.appointments.max_participants IS
  'Only set for group class instances. NULL means no capacity limit (1:1 appointments).';

-- Class instances have no single "main client" — attendees live in
-- appointment_participants. 1:1 appointments still always set client_id;
-- this only widens the constraint to allow the new group case.
ALTER TABLE public.appointments
  ALTER COLUMN client_id DROP NOT NULL;

-- Each attendee of a group class has their own independent lifecycle
-- (request / confirm / cancel / attendance), separate from the shared
-- appointment container and from every other attendee.
ALTER TABLE public.appointment_participants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_confirmation'
    CHECK (status IN ('pending_confirmation', 'confirmed', 'cancelled', 'attended', 'no_show')),
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL;
