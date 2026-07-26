-- ============================================================
-- Migration 000140: Check-in RPCs must also verify is_active
--
-- award_gym_checkin() and award_app_checkin() (migration 000114) only
-- verified profiles.approval_status = 'approved' before awarding a
-- check-in/XP. A profile deactivated by an admin (is_active = FALSE —
-- the flag every nav-layout guard checks to hide a suspended/removed
-- client from the app) keeps approval_status untouched, so a
-- deactivated client's session could still call these RPCs directly
-- (they only require a valid JWT for auth.uid(), not access to any
-- particular screen) and keep earning XP/streaks/badges and logging
-- gym visits after being deactivated.
-- ============================================================

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
          AND checked_in_at::DATE = CURRENT_DATE
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
    VALUES (p_user_id, p_tenant_id, p_branch_id, 'qr', v_total_xp)
    RETURNING id INTO v_checkin_id;

    UPDATE user_game_stats
    SET current_streak    = v_new_streak,
        longest_streak    = GREATEST(longest_streak, v_new_streak),
        last_checkin_date = CURRENT_DATE,
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
          AND checked_in_at::DATE = CURRENT_DATE
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

    IF v_stats.app_last_checkin_date = CURRENT_DATE - INTERVAL '1 day' THEN
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
        app_last_checkin_date = CURRENT_DATE,
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
