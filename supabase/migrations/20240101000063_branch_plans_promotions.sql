-- Scope plans and promotions to branches.
-- NULL branch_id = visible to all branches (global).
-- A specific branch_id = visible only to clients/coaches in that branch.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plans_branch
  ON public.plans(branch_id) WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_branch
  ON public.promotions(branch_id) WHERE branch_id IS NOT NULL;
