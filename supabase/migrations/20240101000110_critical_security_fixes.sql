-- ============================================================
-- Migration 000110: Critical & high severity security fixes
--
-- Found in a full RLS/RPC security audit (2026-07-15). Every item
-- below is a SECURITY DEFINER RPC or RLS policy that either trusts
-- client-supplied identifiers instead of auth.uid()/get_tenant_id(),
-- or an old permissive policy left active alongside a later, correct
-- one (Postgres OR's multiple permissive policies together, so the
-- old one alone defeats the fix).
-- ============================================================

-- ── 1. assign_plan(): no permission check, no plan/tenant match ────────────
-- Any authenticated user could assign themselves (or anyone) a paid plan of
-- any tenant at any price, including $0.
DROP FUNCTION IF EXISTS public.assign_plan CASCADE;
CREATE OR REPLACE FUNCTION public.assign_plan(
  p_user_id   UUID,
  p_tenant_id UUID,
  p_plan_id   UUID,
  p_price     NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_tenant_id IS DISTINCT FROM public.get_tenant_id()
     OR NOT public.has_permission('billing.manage') THEN
    RAISE EXCEPTION 'Not authorized to assign plans for this tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.plans
    WHERE id = p_plan_id AND tenant_id = p_tenant_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'User does not belong to this tenant';
  END IF;

  UPDATE public.user_subscriptions
  SET status = 'cancelled',
      end_date = NOW()
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND status = 'active';

  INSERT INTO public.user_subscriptions (
    user_id, tenant_id, plan_id, status, start_date, final_price
  ) VALUES (
    p_user_id, p_tenant_id, p_plan_id, 'active', NOW(), p_price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_plan(UUID, UUID, UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_plan(UUID, UUID, UUID, NUMERIC) TO authenticated;

-- ── 2. set_own_branch(): any authenticated user could hop tenants ──────────
-- Only allow the one-time onboarding claim (profile has no branch yet).
DROP FUNCTION IF EXISTS public.set_own_branch CASCADE;
CREATE OR REPLACE FUNCTION public.set_own_branch(p_branch_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND branch_id IS NULL
  ) THEN
    RAISE EXCEPTION 'branch_already_set';
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.branches
  WHERE id = p_branch_id AND is_active = TRUE;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'branch_not_found';
  END IF;

  UPDATE public.profiles
  SET branch_id = p_branch_id,
      tenant_id = v_tenant_id
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_branch(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_branch(UUID) TO authenticated;

-- ── 3. smtp_configs / email_templates / communication_rules ────────────────
-- Migration 000108 tried to require has_permission('settings.manage') but
-- reused the same policy names already created (without the check) in
-- migration 000052, so its IF NOT EXISTS guard made the fix a no-op for
-- smtp_configs/email_templates, and left the old comm_rules_admin_all policy
-- active alongside the new stricter one for communication_rules.
DROP POLICY IF EXISTS "smtp_configs_admin_all" ON public.smtp_configs;
CREATE POLICY "smtp_configs_admin_all" ON public.smtp_configs
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'));

DROP POLICY IF EXISTS "email_templates_admin_all" ON public.email_templates;
CREATE POLICY "email_templates_admin_all" ON public.email_templates
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'));

DROP POLICY IF EXISTS "comm_rules_admin_all" ON public.communication_rules;

DROP POLICY IF EXISTS "email_logs_admin_read" ON public.email_logs;
CREATE POLICY "email_logs_admin_read" ON public.email_logs
  FOR SELECT
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('settings.manage'));

-- ── 4. Platform billing RPCs had no GRANT/REVOKE at all ─────────────────────
-- Postgres default (EXECUTE to PUBLIC) made them callable by any authenticated
-- user. They're only ever called from the Stripe platform webhook route using
-- the service-role client — restrict to service_role.
REVOKE ALL ON FUNCTION public.upsert_platform_subscription(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_platform_subscription(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION public.renew_platform_subscription(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_platform_subscription(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION public.suspend_platform_subscription(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_platform_subscription(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.cancel_platform_subscription(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_platform_subscription(TEXT) TO service_role;

-- ── 5. get_billing_summary(): permission check without tenant match ────────
-- An admin of Tenant A could pass any p_tenant_id and read Tenant B's MRR
-- and invoice counts, since has_permission() only checks the caller's own
-- tenant's permissions, not that p_tenant_id matches it.
DROP FUNCTION IF EXISTS public.get_billing_summary CASCADE;
CREATE OR REPLACE FUNCTION public.get_billing_summary(p_tenant_id UUID)
RETURNS TABLE (
  mrr                  NUMERIC,
  invoices_pending     BIGINT,
  invoices_overdue     BIGINT,
  subscriptions_active BIGINT,
  subscriptions_expiring_7d BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_tenant_id IS DISTINCT FROM public.get_tenant_id()
     OR NOT public.has_permission('billing.manage') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN s.status = 'active' THEN s.final_price ELSE 0 END), 0) AS mrr,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'pending')   AS invoices_pending,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'overdue')   AS invoices_overdue,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active')    AS subscriptions_active,
    COUNT(DISTINCT s.id) FILTER (
      WHERE s.status = 'active'
        AND s.end_date IS NOT NULL
        AND s.end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    ) AS subscriptions_expiring_7d
  FROM public.user_subscriptions s
  LEFT JOIN public.invoices i ON i.subscription_id = s.id AND i.tenant_id = p_tenant_id
  WHERE s.tenant_id = p_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_billing_summary(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_billing_summary(UUID) TO authenticated;

-- ── 6. list_appointments(): returned every appointment in the tenant ───────
-- regardless of caller's role, bypassing the appointments_admin_all /
-- appointments_coach_read / appointments_client_read table policies that
-- this SECURITY DEFINER function otherwise circumvents.
DROP FUNCTION IF EXISTS public.list_appointments CASCADE;
CREATE OR REPLACE FUNCTION public.list_appointments(
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  description      TEXT,
  start_time       TIMESTAMPTZ,
  end_time         TIMESTAMPTZ,
  status           TEXT,
  appointment_type TEXT,
  location         TEXT,
  meeting_url      TEXT,
  group_mode       TEXT,
  coach_id         UUID,
  coach_name       TEXT,
  client_id        UUID,
  client_name      TEXT,
  client_avatar    TEXT,
  participants     JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_is_admin  BOOLEAN;
BEGIN
  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant no encontrado para el usuario %', auth.uid();
  END IF;

  v_is_admin := EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles ro ON ro.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = v_tenant_id
      AND ro.name = 'admin'
  );

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.description,
    a.start_time,
    a.end_time,
    a.status::TEXT,
    a.appointment_type,
    a.location,
    a.meeting_url,
    COALESCE(a.group_mode, 'individual'),
    a.coach_id,
    coach_p.full_name       AS coach_name,
    a.client_id,
    client_p.full_name      AS client_name,
    client_p.avatar_url     AS client_avatar,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',         pp.id,
          'full_name',  pp.full_name,
          'avatar_url', pp.avatar_url
        )
        ORDER BY pp.full_name
      )
      FROM public.appointment_participants ap
      JOIN public.profiles pp ON pp.id = ap.user_id
      WHERE ap.appointment_id = a.id
    ), '[]'::JSONB) AS participants
  FROM public.appointments a
  LEFT JOIN public.profiles coach_p  ON coach_p.id  = a.coach_id
  LEFT JOIN public.profiles client_p ON client_p.id = a.client_id
  WHERE a.tenant_id = v_tenant_id
    AND (v_is_admin OR a.coach_id = auth.uid() OR a.client_id = auth.uid())
    AND (p_start_time IS NULL OR a.start_time >= p_start_time)
    AND (p_end_time   IS NULL OR a.start_time <  p_end_time)
  ORDER BY a.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;

-- ── 7. award_checkin(): no check that caller == p_user_id ───────────────────
-- Every real call site (mobile, web) always passes the caller's own user id;
-- there is no legitimate "check in on behalf of someone else" flow.
CREATE OR REPLACE FUNCTION public.award_checkin(
    p_user_id   UUID,
    p_tenant_id UUID,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_checkin_id      UUID;
    v_stats           user_game_stats%ROWTYPE;
    v_new_streak      INTEGER := 1;
    v_base_xp         INTEGER := 50;
    v_streak_bonus    INTEGER := 0;
    v_total_xp        INTEGER;
    v_new_level       INTEGER;
    v_badge           badge_definitions%ROWTYPE;
    v_badges_json     JSONB   := '[]'::JSONB;
    v_milestone_xp    INTEGER;
BEGIN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Cannot check in on behalf of another user';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_user_id
          AND tenant_id = p_tenant_id
          AND approval_status = 'approved'
    ) THEN
        RETURN jsonb_build_object(
            'success',            false,
            'error',              'user_not_approved',
            'already_checked_in', false,
            'xp_earned',          0,
            'new_streak',         0,
            'new_badges',         '[]'::JSONB,
            'new_level',          NULL
        );
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM branches
        WHERE id        = p_branch_id
          AND tenant_id = p_tenant_id
    ) THEN
        RETURN jsonb_build_object(
            'success',            false,
            'error',              'branch_not_in_tenant',
            'already_checked_in', false,
            'xp_earned',          0,
            'new_streak',         0,
            'new_badges',         '[]'::JSONB,
            'new_level',          NULL
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM gym_checkins
        WHERE user_id   = p_user_id
          AND tenant_id = p_tenant_id
          AND checked_in_at::DATE = CURRENT_DATE
    ) THEN
        SELECT current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success',            false,
            'already_checked_in', true,
            'xp_earned',          0,
            'new_streak',         COALESCE(v_new_streak, 0),
            'new_badges',         '[]'::JSONB,
            'new_level',          NULL
        );
    END IF;

    INSERT INTO user_game_stats (user_id, tenant_id)
    VALUES (p_user_id, p_tenant_id)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;

    SELECT * INTO v_stats
    FROM user_game_stats
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    IF v_stats.last_checkin_date = CURRENT_DATE - INTERVAL '1 day' THEN
        v_new_streak := v_stats.current_streak + 1;
    ELSE
        v_new_streak := 1;
    END IF;

    IF    v_new_streak >= 30 THEN v_streak_bonus := 200;
    ELSIF v_new_streak >= 14 THEN v_streak_bonus := 100;
    ELSIF v_new_streak >=  7 THEN v_streak_bonus :=  50;
    ELSIF v_new_streak >=  3 THEN v_streak_bonus :=  25;
    ELSE                          v_streak_bonus :=   0;
    END IF;

    v_total_xp := v_base_xp + v_streak_bonus;

    INSERT INTO gym_checkins (user_id, tenant_id, branch_id, method, xp_earned)
    VALUES (p_user_id, p_tenant_id, p_branch_id, 'app', v_total_xp)
    RETURNING id INTO v_checkin_id;

    UPDATE user_game_stats
    SET current_streak    = v_new_streak,
        longest_streak    = GREATEST(longest_streak, v_new_streak),
        last_checkin_date = CURRENT_DATE,
        total_checkins    = total_checkins + 1,
        updated_at        = NOW()
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    PERFORM public._gam_award_xp(
        p_user_id, p_tenant_id, v_total_xp,
        'checkin', v_checkin_id
    );

    CASE v_new_streak
        WHEN 7   THEN v_milestone_xp := 100;
        WHEN 30  THEN v_milestone_xp := 300;
        WHEN 100 THEN v_milestone_xp := 500;
        WHEN 365 THEN v_milestone_xp := 1000;
        ELSE          v_milestone_xp := 0;
    END CASE;

    IF v_milestone_xp > 0 THEN
        PERFORM public._gam_award_xp(
            p_user_id, p_tenant_id, v_milestone_xp,
            'streak_milestone', v_checkin_id,
            'Streak milestone: ' || v_new_streak || ' days'
        );
    END IF;

    v_new_level := public._gam_update_level(p_user_id, p_tenant_id);

    FOR v_badge IN
        SELECT * FROM public._gam_check_badges(p_user_id, p_tenant_id)
    LOOP
        v_badges_json := v_badges_json || jsonb_build_object(
            'id',     v_badge.id,
            'slug',   v_badge.slug,
            'name',   v_badge.name,
            'icon',   v_badge.icon,
            'rarity', v_badge.rarity
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success',            true,
        'already_checked_in', false,
        'xp_earned',          v_total_xp,
        'new_streak',         v_new_streak,
        'new_badges',         v_badges_json,
        'new_level',          v_new_level
    );

EXCEPTION
    WHEN unique_violation THEN
        SELECT current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success',            false,
            'already_checked_in', true,
            'xp_earned',          0,
            'new_streak',         COALESCE(v_new_streak, 0),
            'new_badges',         '[]'::JSONB,
            'new_level',          NULL
        );
END;
$$;

REVOKE ALL ON FUNCTION public.award_checkin(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_checkin(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_checkin(UUID, UUID, UUID) TO service_role;

-- ── 8. Storage buckets: cross-tenant / anonymous reads ──────────────────────
-- videos, video-thumbnails and exercise-demos all store objects under a
-- `${tenant_id}/...` path prefix (see apps/mobile/services/videos.service.ts
-- and routines.service.ts). The existing SELECT policies had no `TO
-- authenticated` clause and no tenant scoping, so any anonymous internet
-- user who obtained a storage path could download any tenant's paid video
-- content directly, bypassing the app's paywall entirely.
DROP POLICY IF EXISTS "videos_public_read" ON storage.objects;
CREATE POLICY "videos_authenticated_tenant_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = public.get_tenant_id()::text
  );

DROP POLICY IF EXISTS "thumbnails_public_read" ON storage.objects;
CREATE POLICY "thumbnails_authenticated_tenant_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'video-thumbnails'
    AND (storage.foldername(name))[1] = public.get_tenant_id()::text
  );

DROP POLICY IF EXISTS "demos_auth_read" ON storage.objects;
CREATE POLICY "demos_authenticated_tenant_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'exercise-demos'
    AND (storage.foldername(name))[1] = public.get_tenant_id()::text
  );

-- ── 9. Junction tables: has_permission() checked without a tenant_id match ─
-- billing.manage is scoped to the CALLER's own tenant internally, but none
-- of these write policies verified that the plan_id/promotion_id/routine_id
-- etc referenced by the row actually belongs to that same tenant.
DROP POLICY IF EXISTS "plan_routines_admin_insert" ON public.plan_routines;
CREATE POLICY "plan_routines_admin_insert" ON public.plan_routines
  FOR INSERT WITH CHECK (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.tenant_id = public.get_tenant_id())
    AND EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.tenant_id = public.get_tenant_id())
  );
DROP POLICY IF EXISTS "plan_routines_admin_delete" ON public.plan_routines;
CREATE POLICY "plan_routines_admin_delete" ON public.plan_routines
  FOR DELETE USING (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.tenant_id = public.get_tenant_id())
  );

DROP POLICY IF EXISTS "promotion_routines_admin_insert" ON public.promotion_routines;
CREATE POLICY "promotion_routines_admin_insert" ON public.promotion_routines
  FOR INSERT WITH CHECK (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.tenant_id = public.get_tenant_id())
    AND EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.tenant_id = public.get_tenant_id())
  );
DROP POLICY IF EXISTS "promotion_routines_admin_delete" ON public.promotion_routines;
CREATE POLICY "promotion_routines_admin_delete" ON public.promotion_routines
  FOR DELETE USING (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.tenant_id = public.get_tenant_id())
  );

DROP POLICY IF EXISTS "plan_nutritions_admin_insert" ON public.plan_nutritions;
CREATE POLICY "plan_nutritions_admin_insert" ON public.plan_nutritions
  FOR INSERT WITH CHECK (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.tenant_id = public.get_tenant_id())
    AND EXISTS (SELECT 1 FROM public.nutrition_plans np WHERE np.id = nutrition_plan_id AND np.tenant_id = public.get_tenant_id())
  );
DROP POLICY IF EXISTS "plan_nutritions_admin_delete" ON public.plan_nutritions;
CREATE POLICY "plan_nutritions_admin_delete" ON public.plan_nutritions
  FOR DELETE USING (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.tenant_id = public.get_tenant_id())
  );

DROP POLICY IF EXISTS "promotion_nutritions_admin_insert" ON public.promotion_nutritions;
CREATE POLICY "promotion_nutritions_admin_insert" ON public.promotion_nutritions
  FOR INSERT WITH CHECK (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.tenant_id = public.get_tenant_id())
    AND EXISTS (SELECT 1 FROM public.nutrition_plans np WHERE np.id = nutrition_plan_id AND np.tenant_id = public.get_tenant_id())
  );
DROP POLICY IF EXISTS "promotion_nutritions_admin_delete" ON public.promotion_nutritions;
CREATE POLICY "promotion_nutritions_admin_delete" ON public.promotion_nutritions
  FOR DELETE USING (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.tenant_id = public.get_tenant_id())
  );

DROP POLICY IF EXISTS "plan_videos_admin_insert" ON public.plan_videos;
CREATE POLICY "plan_videos_admin_insert" ON public.plan_videos
  FOR INSERT WITH CHECK (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.tenant_id = public.get_tenant_id())
    AND EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.tenant_id = public.get_tenant_id())
  );
DROP POLICY IF EXISTS "plan_videos_admin_delete" ON public.plan_videos;
CREATE POLICY "plan_videos_admin_delete" ON public.plan_videos
  FOR DELETE USING (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.tenant_id = public.get_tenant_id())
  );

DROP POLICY IF EXISTS "promotion_videos_admin_insert" ON public.promotion_videos;
CREATE POLICY "promotion_videos_admin_insert" ON public.promotion_videos
  FOR INSERT WITH CHECK (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.tenant_id = public.get_tenant_id())
    AND EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.tenant_id = public.get_tenant_id())
  );
DROP POLICY IF EXISTS "promotion_videos_admin_delete" ON public.promotion_videos;
CREATE POLICY "promotion_videos_admin_delete" ON public.promotion_videos
  FOR DELETE USING (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.tenant_id = public.get_tenant_id())
  );

DROP POLICY IF EXISTS "promotion_targets_admin_write" ON public.promotion_targets;
CREATE POLICY "promotion_targets_admin_write" ON public.promotion_targets
  FOR ALL
  USING (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.tenant_id = public.get_tenant_id())
  )
  WITH CHECK (
    public.has_permission('billing.manage')
    AND EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.tenant_id = public.get_tenant_id())
  );

DROP POLICY IF EXISTS "cca_staff_all" ON public.coach_client_assignments;
CREATE POLICY "cca_staff_all" ON public.coach_client_assignments
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'));

DROP POLICY IF EXISTS "video_categories_staff_write" ON public.video_categories;
CREATE POLICY "video_categories_staff_write" ON public.video_categories
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('routines.create'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('routines.create'));

-- invoices_admin_all (000108) already has the correct tenant + permission
-- check; drop the older permission-only policy that was OR'd alongside it.
DROP POLICY IF EXISTS "invoices_admin_write" ON public.invoices;

-- ── 10. routines_coach_read: unrestricted tenant-wide paywall bypass ───────
-- Granted blanket SELECT to every tenant member regardless of subscription,
-- unlike videos/nutrition_plans which were correctly paywall-gated.
-- routines_staff_read / routines_admin_all (permission-gated) and
-- routines_subscriber_read (subscription-gated) already cover legitimate
-- access; this policy only ever widened it.
DROP POLICY IF EXISTS "routines_coach_read" ON public.routines;

-- ── 11. Dead cross-tenant batch RPC reachable by any authenticated user ────
-- expire_due_subscriptions() operates across ALL tenants with no auth check
-- and isn't called from any app code or cron job (expire_subscriptions_for_
-- expired_plans() is the one actually scheduled) — restrict to service_role.
REVOKE ALL ON FUNCTION public.expire_due_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_due_subscriptions() TO service_role;
