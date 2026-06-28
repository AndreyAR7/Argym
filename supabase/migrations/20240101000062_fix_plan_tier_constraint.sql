-- Fix plan_tier check constraint.
-- Existing rows may have plan_tier = 'all' (legacy value) — normalize to NULL.
-- Then replace the constraint so only NULL or the three tiers are valid.

UPDATE public.plans
  SET plan_tier = NULL
  WHERE plan_tier NOT IN ('beginner', 'intermediate', 'advanced');

ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_plan_tier_check;

ALTER TABLE public.plans
  ADD CONSTRAINT plans_plan_tier_check
  CHECK (plan_tier IS NULL OR plan_tier IN ('beginner', 'intermediate', 'advanced'));
