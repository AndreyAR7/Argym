-- Add new enum values to appointment_status before they are used in policies
-- Must be in a separate migration (separate transaction) from where values are used
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'pending_confirmation';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'postpone_requested';
