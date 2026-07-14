-- Apply all RLS policies that were defined in migration files but never applied
-- to the new project (soxlhslpgnegmihjdwod). Pattern: tables had RLS enabled
-- but policies from original migrations were absent.

-- ─── BRANCHES ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branches' AND policyname='branches_auth_read') THEN
    EXECUTE $p$
      CREATE POLICY "branches_auth_read" ON public.branches
        FOR SELECT TO authenticated
        USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branches' AND policyname='branches_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "branches_admin_all" ON public.branches
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('gym.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('gym.manage'))
    $p$;
  END IF;
END $$;

-- ─── ROUTINES ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='routines' AND policyname='routines_tenant_read') THEN
    EXECUTE $p$
      CREATE POLICY "routines_tenant_read" ON public.routines
        FOR SELECT TO authenticated
        USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='routines' AND policyname='routines_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "routines_admin_write" ON public.routines
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'))
    $p$;
  END IF;
END $$;

-- ─── VIDEOS ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='videos' AND policyname='videos_tenant_read') THEN
    EXECUTE $p$
      CREATE POLICY "videos_tenant_read" ON public.videos
        FOR SELECT TO authenticated
        USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='videos' AND policyname='videos_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "videos_admin_write" ON public.videos
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'))
    $p$;
  END IF;
END $$;

-- ─── VIDEO CATEGORIES ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_categories' AND policyname='video_categories_tenant_read') THEN
    EXECUTE $p$
      CREATE POLICY "video_categories_tenant_read" ON public.video_categories
        FOR SELECT TO authenticated
        USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_categories' AND policyname='video_categories_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "video_categories_admin_write" ON public.video_categories
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'))
    $p$;
  END IF;
END $$;

-- ─── VIDEO PROGRESS (uses client_id, not user_id) ───────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_progress' AND policyname='video_progress_own') THEN
    EXECUTE $p$
      CREATE POLICY "video_progress_own" ON public.video_progress
        FOR ALL
        USING (client_id = auth.uid() AND tenant_id = public.get_tenant_id())
        WITH CHECK (client_id = auth.uid() AND tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_progress' AND policyname='video_progress_staff_read') THEN
    EXECUTE $p$
      CREATE POLICY "video_progress_staff_read" ON public.video_progress
        FOR SELECT
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('clients.view'))
    $p$;
  END IF;
END $$;

-- ─── VIDEO ASSIGNMENTS ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_assignments' AND policyname='video_assignments_own_read') THEN
    EXECUTE $p$
      CREATE POLICY "video_assignments_own_read" ON public.video_assignments
        FOR SELECT
        USING (client_id = auth.uid() AND tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_assignments' AND policyname='video_assignments_staff_all') THEN
    EXECUTE $p$
      CREATE POLICY "video_assignments_staff_all" ON public.video_assignments
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'))
    $p$;
  END IF;
END $$;

-- ─── PLANS ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='plans' AND policyname='plans_tenant_read') THEN
    EXECUTE $p$
      CREATE POLICY "plans_tenant_read" ON public.plans
        FOR SELECT TO authenticated
        USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='plans' AND policyname='plans_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "plans_admin_write" ON public.plans
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('billing.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('billing.manage'))
    $p$;
  END IF;
END $$;

-- ─── PROMOTIONS ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promotions' AND policyname='promotions_tenant_read') THEN
    EXECUTE $p$
      CREATE POLICY "promotions_tenant_read" ON public.promotions
        FOR SELECT TO authenticated
        USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promotions' AND policyname='promotions_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "promotions_admin_write" ON public.promotions
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('billing.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('billing.manage'))
    $p$;
  END IF;
END $$;

-- ─── PROMOTION TARGETS (no tenant_id; join through promotions) ───────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promotion_targets' AND policyname='promotion_targets_tenant_read') THEN
    EXECUTE $p$
      CREATE POLICY "promotion_targets_tenant_read" ON public.promotion_targets
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.promotions pr
            WHERE pr.id = promotion_id AND pr.tenant_id = public.get_tenant_id()
          )
        )
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promotion_targets' AND policyname='promotion_targets_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "promotion_targets_admin_write" ON public.promotion_targets
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.promotions pr
            WHERE pr.id = promotion_id AND pr.tenant_id = public.get_tenant_id()
          )
          AND public.has_permission('billing.manage')
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.promotions pr
            WHERE pr.id = promotion_id AND pr.tenant_id = public.get_tenant_id()
          )
          AND public.has_permission('billing.manage')
        )
    $p$;
  END IF;
END $$;

-- ─── USER SUBSCRIPTIONS ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_subscriptions' AND policyname='user_subscriptions_own_read') THEN
    EXECUTE $p$
      CREATE POLICY "user_subscriptions_own_read" ON public.user_subscriptions
        FOR SELECT USING (user_id = auth.uid() AND tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_subscriptions' AND policyname='user_subscriptions_staff_all') THEN
    EXECUTE $p$
      CREATE POLICY "user_subscriptions_staff_all" ON public.user_subscriptions
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('billing.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('billing.manage'))
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_subscriptions' AND policyname='user_subscriptions_service_role') THEN
    EXECUTE $p$
      CREATE POLICY "user_subscriptions_service_role" ON public.user_subscriptions
        FOR ALL USING (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;

-- ─── NUTRITION PLANS ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nutrition_plans' AND policyname='nutrition_plans_tenant_read') THEN
    EXECUTE $p$
      CREATE POLICY "nutrition_plans_tenant_read" ON public.nutrition_plans
        FOR SELECT TO authenticated
        USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nutrition_plans' AND policyname='nutrition_plans_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "nutrition_plans_admin_write" ON public.nutrition_plans
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('content.manage'))
    $p$;
  END IF;
END $$;

-- ─── NUTRITION ASSIGNMENTS ───────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nutrition_assignments' AND policyname='nutrition_assignments_own_read') THEN
    EXECUTE $p$
      CREATE POLICY "nutrition_assignments_own_read" ON public.nutrition_assignments
        FOR SELECT
        USING (client_id = auth.uid() AND tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nutrition_assignments' AND policyname='nutrition_assignments_staff_all') THEN
    EXECUTE $p$
      CREATE POLICY "nutrition_assignments_staff_all" ON public.nutrition_assignments
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'))
    $p$;
  END IF;
END $$;

-- ─── APPOINTMENTS ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointments' AND policyname='appointments_own') THEN
    EXECUTE $p$
      CREATE POLICY "appointments_own" ON public.appointments
        FOR ALL
        USING (
          (client_id = auth.uid() OR coach_id = auth.uid())
          AND tenant_id = public.get_tenant_id()
        )
        WITH CHECK (
          (client_id = auth.uid() OR coach_id = auth.uid())
          AND tenant_id = public.get_tenant_id()
        )
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointments' AND policyname='appointments_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "appointments_admin_all" ON public.appointments
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('appointments.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('appointments.manage'))
    $p$;
  END IF;
END $$;

-- ─── APPOINTMENT PARTICIPANTS ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointment_participants' AND policyname='appointment_participants_own') THEN
    EXECUTE $p$
      CREATE POLICY "appointment_participants_own" ON public.appointment_participants
        FOR SELECT
        USING (
          tenant_id = public.get_tenant_id()
          AND EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = appointment_id
              AND (a.client_id = auth.uid() OR a.coach_id = auth.uid())
          )
        )
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='appointment_participants' AND policyname='appointment_participants_admin') THEN
    EXECUTE $p$
      CREATE POLICY "appointment_participants_admin" ON public.appointment_participants
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('appointments.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('appointments.manage'))
    $p$;
  END IF;
END $$;

-- ─── INVOICES ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoices' AND policyname='invoices_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "invoices_admin_all" ON public.invoices
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('billing.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('billing.manage'))
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoices' AND policyname='invoices_service_role') THEN
    EXECUTE $p$
      CREATE POLICY "invoices_service_role" ON public.invoices
        FOR ALL USING (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;

-- ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_templates' AND policyname='email_templates_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "email_templates_admin_all" ON public.email_templates
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
    $p$;
  END IF;
END $$;

-- ─── SMTP CONFIGS ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='smtp_configs' AND policyname='smtp_configs_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "smtp_configs_admin_all" ON public.smtp_configs
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
    $p$;
  END IF;
END $$;

-- ─── COMMUNICATION RULES ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communication_rules' AND policyname='communication_rules_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "communication_rules_admin_all" ON public.communication_rules
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
    $p$;
  END IF;
END $$;

-- ─── TENANT MODULES ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenant_modules' AND policyname='tenant_modules_tenant_read') THEN
    EXECUTE $p$
      CREATE POLICY "tenant_modules_tenant_read" ON public.tenant_modules
        FOR SELECT TO authenticated
        USING (tenant_id = public.get_tenant_id())
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenant_modules' AND policyname='tenant_modules_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "tenant_modules_admin_write" ON public.tenant_modules
        FOR ALL
        USING (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
        WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
    $p$;
  END IF;
END $$;

-- ─── APP INTERNAL CONFIG ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_internal_config' AND policyname='app_internal_config_service_only') THEN
    EXECUTE $p$
      CREATE POLICY "app_internal_config_service_only" ON public.app_internal_config
        FOR ALL USING (auth.role() = 'service_role')
    $p$;
  END IF;
END $$;
