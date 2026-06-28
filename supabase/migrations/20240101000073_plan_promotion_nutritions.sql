-- ============================================================
-- Plan & Promotion → Nutrition Plan access control
-- Nutrition plans assigned to a plan are accessible to all
-- active subscribers of that plan.
-- Nutrition plans assigned to a promotion are accessible to
-- subscribers whose subscription used that promotion.
-- ============================================================

-- ── plan_nutritions ───────────────────────────────────────────
CREATE TABLE public.plan_nutritions (
  plan_id           UUID NOT NULL REFERENCES public.plans(id)          ON DELETE CASCADE,
  nutrition_plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plan_id, nutrition_plan_id)
);

CREATE INDEX idx_plan_nutritions_plan      ON public.plan_nutritions(plan_id);
CREATE INDEX idx_plan_nutritions_nutrition ON public.plan_nutritions(nutrition_plan_id);

ALTER TABLE public.plan_nutritions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_nutritions_tenant_read" ON public.plan_nutritions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_nutritions.plan_id
        AND p.tenant_id = public.get_tenant_id()
    )
  );

CREATE POLICY "plan_nutritions_admin_write" ON public.plan_nutritions
  FOR ALL USING (public.has_permission('billing.manage'));

-- ── promotion_nutritions ──────────────────────────────────────
CREATE TABLE public.promotion_nutritions (
  promotion_id      UUID NOT NULL REFERENCES public.promotions(id)      ON DELETE CASCADE,
  nutrition_plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (promotion_id, nutrition_plan_id)
);

CREATE INDEX idx_promotion_nutritions_promo     ON public.promotion_nutritions(promotion_id);
CREATE INDEX idx_promotion_nutritions_nutrition ON public.promotion_nutritions(nutrition_plan_id);

ALTER TABLE public.promotion_nutritions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotion_nutritions_tenant_read" ON public.promotion_nutritions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.promotions p
      WHERE p.id = promotion_nutritions.promotion_id
        AND p.tenant_id = public.get_tenant_id()
    )
  );

CREATE POLICY "promotion_nutritions_admin_write" ON public.promotion_nutritions
  FOR ALL USING (public.has_permission('billing.manage'));
