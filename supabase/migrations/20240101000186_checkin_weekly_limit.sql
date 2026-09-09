-- QR check-ins never validated against the contracted plan's weekly
-- frequency — a "3 days/week" plan let a client check in every single
-- day. Adds an optional per-plan weekly cap plus a log of every QR
-- check-in attempt (successful or blocked) for an admin report.

ALTER TABLE public.plans
  ADD COLUMN checkins_per_week INT NULL CHECK (checkins_per_week IS NULL OR checkins_per_week > 0);

-- Monday-start week in the tenant's local timezone, same convention the
-- appointment calendars already use for "start of week".
CREATE OR REPLACE FUNCTION public.tenant_local_week_start(p_at TIMESTAMPTZ, p_tenant_id UUID)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT date_trunc('week', public.tenant_local_date(p_at, p_tenant_id)::TIMESTAMP)::DATE
$$;

CREATE TABLE public.checkin_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id     UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  result        TEXT NOT NULL CHECK (result IN (
                  'success', 'already_checked_in', 'no_active_membership',
                  'weekly_limit_reached', 'branch_not_in_tenant', 'user_not_approved'
                )),
  plan_id       UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  weekly_limit  INT,
  weekly_count  INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX checkin_attempts_tenant_created_idx ON public.checkin_attempts (tenant_id, created_at DESC);
CREATE INDEX checkin_attempts_tenant_user_created_idx ON public.checkin_attempts (tenant_id, user_id, created_at DESC);

ALTER TABLE public.checkin_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_attempts_staff_read" ON public.checkin_attempts
  FOR SELECT
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'));

-- award_gym_checkin: same signature, adds a weekly-limit gate between the
-- membership check and the "already checked in today" check, and logs
-- every branch's outcome to checkin_attempts for the admin report. When a
-- client has more than one active physical-access plan, the most
-- permissive limit wins (any unlimited plan removes the cap entirely,
-- otherwise the highest per-plan limit applies).
CREATE OR REPLACE FUNCTION public.award_gym_checkin(
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
    v_today           DATE;
    v_week_start      DATE;
    v_new_streak      INTEGER := 1;
    v_base_xp         INTEGER := 50;
    v_streak_bonus    INTEGER := 0;
    v_total_xp        INTEGER;
    v_new_level       INTEGER;
    v_badge           badge_definitions%ROWTYPE;
    v_badges_json     JSONB   := '[]'::JSONB;
    v_milestone_xp    INTEGER;
    v_plan_id         UUID;
    v_weekly_limit    INT;
    v_has_unlimited   BOOLEAN;
    v_weekly_count    INT;
BEGIN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Cannot check in on behalf of another user';
    END IF;

    v_today      := public.tenant_local_date(NOW(), p_tenant_id);
    v_week_start := public.tenant_local_week_start(NOW(), p_tenant_id);

    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_user_id
          AND tenant_id = p_tenant_id
          AND approval_status = 'approved'
          AND is_active = TRUE
    ) THEN
        INSERT INTO checkin_attempts (tenant_id, user_id, branch_id, result)
        VALUES (p_tenant_id, p_user_id, p_branch_id, 'user_not_approved');

        RETURN jsonb_build_object(
            'success', false, 'error', 'user_not_approved',
            'already_checked_in', false, 'xp_earned', 0,
            'new_streak', 0, 'new_badges', '[]'::JSONB, 'new_level', NULL,
            'weekly_checkins_used', NULL, 'weekly_checkin_limit', NULL
        );
    END IF;

    -- Most permissive active physical-access plan wins: any NULL
    -- (unlimited) plan removes the cap; otherwise take the highest limit.
    SELECT
      bool_or(p.checkins_per_week IS NULL),
      MAX(p.checkins_per_week),
      MAX(p.id)
    INTO v_has_unlimited, v_weekly_limit, v_plan_id
    FROM public.user_subscriptions us
    JOIN public.plans p ON p.id = us.plan_id
    WHERE us.user_id   = p_user_id
      AND us.tenant_id = p_tenant_id
      AND us.status    = 'active'
      AND p.grants_physical_access = TRUE;

    IF v_plan_id IS NULL THEN
        INSERT INTO checkin_attempts (tenant_id, user_id, branch_id, result)
        VALUES (p_tenant_id, p_user_id, p_branch_id, 'no_active_membership');

        RETURN jsonb_build_object(
            'success', false, 'error', 'no_active_membership',
            'already_checked_in', false, 'xp_earned', 0,
            'new_streak', 0, 'new_badges', '[]'::JSONB, 'new_level', NULL,
            'weekly_checkins_used', NULL, 'weekly_checkin_limit', NULL
        );
    END IF;

    IF v_has_unlimited THEN
        v_weekly_limit := NULL;
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM branches
        WHERE id        = p_branch_id
          AND tenant_id = p_tenant_id
    ) THEN
        INSERT INTO checkin_attempts (tenant_id, user_id, branch_id, result, plan_id)
        VALUES (p_tenant_id, p_user_id, p_branch_id, 'branch_not_in_tenant', v_plan_id);

        RETURN jsonb_build_object(
            'success', false, 'error', 'branch_not_in_tenant',
            'already_checked_in', false, 'xp_earned', 0,
            'new_streak', 0, 'new_badges', '[]'::JSONB, 'new_level', NULL,
            'weekly_checkins_used', NULL, 'weekly_checkin_limit', NULL
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM gym_checkins
        WHERE user_id   = p_user_id
          AND tenant_id = p_tenant_id
          AND method    = 'qr'
          AND public.tenant_local_date(checked_in_at, tenant_id) = v_today
    ) THEN
        SELECT current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        INSERT INTO checkin_attempts (tenant_id, user_id, branch_id, result, plan_id, weekly_limit)
        VALUES (p_tenant_id, p_user_id, p_branch_id, 'already_checked_in', v_plan_id, v_weekly_limit);

        RETURN jsonb_build_object(
            'success', false, 'already_checked_in', true, 'xp_earned', 0,
            'new_streak', COALESCE(v_new_streak, 0),
            'new_badges', '[]'::JSONB, 'new_level', NULL,
            'weekly_checkins_used', NULL, 'weekly_checkin_limit', v_weekly_limit
        );
    END IF;

    SELECT COUNT(*) INTO v_weekly_count
    FROM gym_checkins
    WHERE user_id   = p_user_id
      AND tenant_id = p_tenant_id
      AND method    = 'qr'
      AND public.tenant_local_date(checked_in_at, tenant_id) >= v_week_start
      AND public.tenant_local_date(checked_in_at, tenant_id) <  v_week_start + 7;

    IF v_weekly_limit IS NOT NULL THEN
        IF v_weekly_count >= v_weekly_limit THEN
            INSERT INTO checkin_attempts (tenant_id, user_id, branch_id, result, plan_id, weekly_limit, weekly_count)
            VALUES (p_tenant_id, p_user_id, p_branch_id, 'weekly_limit_reached', v_plan_id, v_weekly_limit, v_weekly_count);

            RETURN jsonb_build_object(
                'success', false, 'error', 'weekly_limit_reached',
                'already_checked_in', false, 'xp_earned', 0,
                'new_streak', 0, 'new_badges', '[]'::JSONB, 'new_level', NULL,
                'weekly_checkins_used', v_weekly_count, 'weekly_checkin_limit', v_weekly_limit
            );
        END IF;
    END IF;

    INSERT INTO user_game_stats (user_id, tenant_id)
    VALUES (p_user_id, p_tenant_id)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;

    SELECT * INTO v_stats
    FROM user_game_stats
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    IF v_stats.last_checkin_date = v_today - INTERVAL '1 day' THEN
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
    VALUES (p_user_id, p_tenant_id, p_branch_id, 'qr', v_total_xp)
    RETURNING id INTO v_checkin_id;

    UPDATE user_game_stats
    SET current_streak    = v_new_streak,
        longest_streak    = GREATEST(longest_streak, v_new_streak),
        last_checkin_date = v_today,
        total_checkins    = total_checkins + 1,
        updated_at        = NOW()
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    PERFORM public._gam_award_xp(p_user_id, p_tenant_id, v_total_xp, 'checkin', v_checkin_id);

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
            'id', v_badge.id, 'slug', v_badge.slug, 'name', v_badge.name,
            'icon', v_badge.icon, 'rarity', v_badge.rarity
        );
    END LOOP;

    INSERT INTO checkin_attempts (tenant_id, user_id, branch_id, result, plan_id, weekly_limit, weekly_count)
    VALUES (p_tenant_id, p_user_id, p_branch_id, 'success', v_plan_id, v_weekly_limit, COALESCE(v_weekly_count, 0) + 1);

    RETURN jsonb_build_object(
        'success', true, 'already_checked_in', false, 'xp_earned', v_total_xp,
        'new_streak', v_new_streak, 'new_badges', v_badges_json, 'new_level', v_new_level,
        'weekly_checkins_used', COALESCE(v_weekly_count, 0) + 1, 'weekly_checkin_limit', v_weekly_limit
    );

EXCEPTION
    WHEN unique_violation THEN
        SELECT current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        INSERT INTO checkin_attempts (tenant_id, user_id, branch_id, result, plan_id, weekly_limit)
        VALUES (p_tenant_id, p_user_id, p_branch_id, 'already_checked_in', v_plan_id, v_weekly_limit);

        RETURN jsonb_build_object(
            'success', false, 'already_checked_in', true, 'xp_earned', 0,
            'new_streak', COALESCE(v_new_streak, 0),
            'new_badges', '[]'::JSONB, 'new_level', NULL,
            'weekly_checkins_used', NULL, 'weekly_checkin_limit', v_weekly_limit
        );
END;
$$;
