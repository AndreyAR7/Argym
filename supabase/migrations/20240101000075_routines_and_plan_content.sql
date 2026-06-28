-- ============================================================
-- Migration 000075: Plan/promotion → Routine junction tables
--
-- The routines table already exists in the DB.
-- Junction tables must be created BEFORE the subscriber RLS
-- policy on routines (which references them).
-- ============================================================

-- ── plan_routines ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_routines (
  plan_id    UUID NOT NULL REFERENCES public.plans(id)    ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plan_id, routine_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_routines_plan    ON public.plan_routines(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_routines_routine ON public.plan_routines(routine_id);

ALTER TABLE public.plan_routines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='plan_routines' AND policyname='plan_routines_tenant_read') THEN
    EXECUTE $pol$
      CREATE POLICY "plan_routines_tenant_read" ON public.plan_routines
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.plans p
            WHERE p.id = plan_routines.plan_id
              AND p.tenant_id = public.get_tenant_id()
          )
        )
    $pol$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='plan_routines' AND policyname='plan_routines_admin_write') THEN
    EXECUTE $pol$
      CREATE POLICY "plan_routines_admin_write" ON public.plan_routines
        FOR ALL USING (public.has_permission('billing.manage'))
    $pol$;
  END IF;
END $$;

-- ── promotion_routines ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promotion_routines (
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  routine_id   UUID NOT NULL REFERENCES public.routines(id)   ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (promotion_id, routine_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_routines_promo   ON public.promotion_routines(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_routines_routine ON public.promotion_routines(routine_id);

ALTER TABLE public.promotion_routines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promotion_routines' AND policyname='promotion_routines_tenant_read') THEN
    EXECUTE $pol$
      CREATE POLICY "promotion_routines_tenant_read" ON public.promotion_routines
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.promotions p
            WHERE p.id = promotion_routines.promotion_id
              AND p.tenant_id = public.get_tenant_id()
          )
        )
    $pol$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promotion_routines' AND policyname='promotion_routines_admin_write') THEN
    EXECUTE $pol$
      CREATE POLICY "promotion_routines_admin_write" ON public.promotion_routines
        FOR ALL USING (public.has_permission('billing.manage'))
    $pol$;
  END IF;
END $$;

-- ── Subscriber read policy on existing routines table ─────────
-- Added AFTER junction tables so the EXECUTE body is valid SQL at create time.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'routines'
      AND policyname = 'routines_subscriber_read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "routines_subscriber_read" ON public.routines
        FOR SELECT USING (
          tenant_id = public.get_tenant_id()
          AND (
            EXISTS (
              SELECT 1 FROM public.user_subscriptions sub
              JOIN public.plan_routines pr ON pr.plan_id = sub.plan_id
              WHERE sub.user_id = auth.uid()
                AND sub.tenant_id = public.get_tenant_id()
                AND sub.status = 'active'
                AND pr.routine_id = routines.id
            )
            OR EXISTS (
              SELECT 1 FROM public.user_subscriptions sub
              JOIN public.promotion_routines prr ON prr.promotion_id = sub.promotion_id
              WHERE sub.user_id = auth.uid()
                AND sub.tenant_id = public.get_tenant_id()
                AND sub.status = 'active'
                AND sub.promotion_id IS NOT NULL
                AND prr.routine_id = routines.id
            )
          )
        )
    $pol$;
  END IF;
END $$;
