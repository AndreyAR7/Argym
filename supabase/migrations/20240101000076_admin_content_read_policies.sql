-- ============================================================
-- Migration 000076: Admin read access for routines + nutrition_plans
--
-- Problem: routines has only subscriber_read (client-facing).
-- nutrition_plans has staff_read (routines.create) but not billing.manage.
-- Admins with billing.manage can write to plan/promotion content
-- junction tables but cannot READ the source tables, so the
-- "available" picker in the contenido page appears empty.
--
-- Fix: add billing.manage-gated read policies for both tables.
-- Multiple SELECT policies on the same table are ORed by Postgres.
-- ============================================================

-- ── routines: admin/staff read ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'routines' AND policyname = 'routines_staff_read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "routines_staff_read" ON public.routines
        FOR SELECT USING (
          tenant_id = public.get_tenant_id()
          AND (
            public.has_permission('routines.create')
            OR public.has_permission('billing.manage')
          )
        )
    $pol$;
  END IF;
END $$;

-- ── nutrition_plans: billing.manage read (complements staff_read) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'nutrition_plans' AND policyname = 'nutrition_plans_admin_read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "nutrition_plans_admin_read" ON public.nutrition_plans
        FOR SELECT USING (
          tenant_id = public.get_tenant_id()
          AND public.has_permission('billing.manage')
        )
    $pol$;
  END IF;
END $$;
