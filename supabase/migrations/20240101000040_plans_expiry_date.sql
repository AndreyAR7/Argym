-- Add optional expiry date to plans
-- A plan can have a hard expiry date after which it's no longer available,
-- independent of billing_cycle (which controls subscription renewal periods).

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.plans.expiry_date IS
  'Optional date after which this plan is no longer available for new subscriptions. NULL means no expiry.';
