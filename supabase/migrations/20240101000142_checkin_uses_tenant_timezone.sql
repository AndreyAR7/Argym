-- ============================================================
-- Migration 000142: Check-in day boundary uses tenant.timezone,
-- not server UTC
--
-- Postgres runs in UTC and award_gym_checkin/award_app_checkin (and the
-- unique index backing "one check-in per day per method") all compared
-- against CURRENT_DATE / a bare ::DATE cast — both UTC. tenants.timezone
-- already exists (default 'America/Costa_Rica', UTC-6) and was simply
-- never consulted. A client checking in after 6pm local time was already
-- "tomorrow" in UTC, so their streak could silently skip a day or break
-- without the app ever showing them a different local date.
--
-- Fix: a tenant_local_date() helper converts a timestamptz to that
-- tenant's local calendar date, used both by the RPCs and by the unique
-- index itself (so the constraint and the application logic agree on
-- what "today" means). Marked IMMUTABLE so it's usable in an index
-- expression — tenant timezone essentially never changes after gym
-- setup, but if one ever is edited, a REINDEX on gym_checkins is needed
-- for existing rows to reflect it (new rows are unaffected).
-- ============================================================

CREATE OR REPLACE FUNCTION public.tenant_local_date(p_at TIMESTAMPTZ, p_tenant_id UUID)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_at AT TIME ZONE COALESCE(
    (SELECT timezone FROM public.tenants WHERE id = p_tenant_id),
    'UTC'
  ))::DATE
$$;

-- ── Rebuild the one-check-in-per-day index on tenant-local date ────────────
DROP INDEX IF EXISTS gym_checkins_one_per_day_per_method_idx;
CREATE UNIQUE INDEX IF NOT EXISTS gym_checkins_one_per_day_per_method_idx
  ON public.gym_checkins (user_id, tenant_id, method, public.tenant_local_date(checked_in_at, tenant_id));

-- ── award_gym_checkin(): compare/store tenant-local dates ───────────────────
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

    v_today := public.tenant_local_date(NOW(), p_tenant_id);

    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_user_id
          AND tenant_id = p_tenant_id
          AND approval_status = 'approved'
          AND is_active = TRUE
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'user_not_approved',
            'already_checked_in', false, 'xp_earned', 0,
            'new_streak', 0, 'new_badges', '[]'::JSONB, 'new_level', NULL
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.user_subscriptions us
        JOIN public.plans p ON p.id = us.plan_id
        WHERE us.user_id   = p_user_id
          AND us.tenant_id = p_tenant_id
          AND us.status    = 'active'
          AND p.grants_physical_access = TRUE
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'no_active_membership',
            'already_checked_in', false, 'xp_earned', 0,
            'new_streak', 0, 'new_badges', '[]'::JSONB, 'new_level', NULL
        );
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM branches
        WHERE id        = p_branch_id
          AND tenant_id = p_tenant_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'branch_not_in_tenant',
            'already_checked_in', false, 'xp_earned', 0,
            'new_streak', 0, 'new_badges', '[]'::JSONB, 'new_level', NULL
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

        RETURN jsonb_build_object(
            'success', false, 'already_checked_in', true, 'xp_earned', 0,
            'new_streak', COALESCE(v_new_streak, 0),
            'new_badges', '[]'::JSONB, 'new_level', NULL
        );
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

    RETURN jsonb_build_object(
        'success', true, 'already_checked_in', false, 'xp_earned', v_total_xp,
        'new_streak', v_new_streak, 'new_badges', v_badges_json, 'new_level', v_new_level
    );

EXCEPTION
    WHEN unique_violation THEN
        SELECT current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success', false, 'already_checked_in', true, 'xp_earned', 0,
            'new_streak', COALESCE(v_new_streak, 0),
            'new_badges', '[]'::JSONB, 'new_level', NULL
        );
END;
$$;

-- ── award_app_checkin(): compare/store tenant-local dates ───────────────────
CREATE OR REPLACE FUNCTION public.award_app_checkin(
    p_user_id   UUID,
    p_tenant_id UUID
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
    v_new_streak      INTEGER := 1;
    v_base_xp         INTEGER := 50;
    v_streak_bonus    INTEGER := 0;
    v_total_xp        INTEGER;
    v_new_level       INTEGER;
    v_milestone_xp    INTEGER;
BEGIN
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Cannot check in on behalf of another user';
    END IF;

    v_today := public.tenant_local_date(NOW(), p_tenant_id);

    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_user_id
          AND tenant_id = p_tenant_id
          AND approval_status = 'approved'
          AND is_active = TRUE
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 'error', 'user_not_approved',
            'already_checked_in', false, 'xp_earned', 0,
            'new_streak', 0, 'new_badges', '[]'::JSONB, 'new_level', NULL
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM gym_checkins
        WHERE user_id   = p_user_id
          AND tenant_id = p_tenant_id
          AND method    = 'app'
          AND public.tenant_local_date(checked_in_at, tenant_id) = v_today
    ) THEN
        SELECT app_current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success', false, 'already_checked_in', true, 'xp_earned', 0,
            'new_streak', COALESCE(v_new_streak, 0), 'new_badges', '[]'::JSONB, 'new_level', NULL
        );
    END IF;

    INSERT INTO user_game_stats (user_id, tenant_id)
    VALUES (p_user_id, p_tenant_id)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;

    SELECT * INTO v_stats
    FROM user_game_stats
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    IF v_stats.app_last_checkin_date = v_today - INTERVAL '1 day' THEN
        v_new_streak := v_stats.app_current_streak + 1;
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
    VALUES (p_user_id, p_tenant_id, NULL, 'app', v_total_xp)
    RETURNING id INTO v_checkin_id;

    UPDATE user_game_stats
    SET app_current_streak    = v_new_streak,
        app_longest_streak    = GREATEST(app_longest_streak, v_new_streak),
        app_last_checkin_date = v_today,
        app_total_checkins    = app_total_checkins + 1,
        updated_at            = NOW()
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
            'App streak milestone: ' || v_new_streak || ' days'
        );
    END IF;

    v_new_level := public._gam_update_level(p_user_id, p_tenant_id);

    RETURN jsonb_build_object(
        'success', true, 'already_checked_in', false, 'xp_earned', v_total_xp,
        'new_streak', v_new_streak, 'new_badges', '[]'::JSONB, 'new_level', v_new_level
    );

EXCEPTION
    WHEN unique_violation THEN
        SELECT app_current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success', false, 'already_checked_in', true, 'xp_earned', 0,
            'new_streak', COALESCE(v_new_streak, 0), 'new_badges', '[]'::JSONB, 'new_level', NULL
        );
END;
$$;
