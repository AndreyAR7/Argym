-- ---------------------------------------------------------------------------
-- Fix: award_checkin must validate that the scanned branch belongs to the
-- user's own tenant. Without this check a member of Gym A could scan the QR
-- of Gym B and be awarded a check-in as if they had visited their own gym.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.award_checkin CASCADE;
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
    -- ------------------------------------------------------------------ --
    -- Guard: user must be approved in this tenant
    -- ------------------------------------------------------------------ --
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

    -- ------------------------------------------------------------------ --
    -- Guard: branch must belong to this tenant (cross-gym check-in blocked)
    -- ------------------------------------------------------------------ --
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

    -- ------------------------------------------------------------------ --
    -- Guard: already checked in today?
    -- ------------------------------------------------------------------ --
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

    -- ------------------------------------------------------------------ --
    -- Ensure a stats row exists (first-time user in this tenant)
    -- ------------------------------------------------------------------ --
    INSERT INTO user_game_stats (user_id, tenant_id)
    VALUES (p_user_id, p_tenant_id)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;

    -- ------------------------------------------------------------------ --
    -- Streak calculation
    -- ------------------------------------------------------------------ --
    SELECT * INTO v_stats
    FROM user_game_stats
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    IF v_stats.last_checkin_date = CURRENT_DATE - INTERVAL '1 day' THEN
        v_new_streak := v_stats.current_streak + 1;
    ELSE
        v_new_streak := 1;
    END IF;

    -- ------------------------------------------------------------------ --
    -- Streak bonus XP
    -- ------------------------------------------------------------------ --
    IF    v_new_streak >= 30 THEN v_streak_bonus := 200;
    ELSIF v_new_streak >= 14 THEN v_streak_bonus := 100;
    ELSIF v_new_streak >=  7 THEN v_streak_bonus :=  50;
    ELSIF v_new_streak >=  3 THEN v_streak_bonus :=  25;
    ELSE                          v_streak_bonus :=   0;
    END IF;

    v_total_xp := v_base_xp + v_streak_bonus;

    -- ------------------------------------------------------------------ --
    -- Record the check-in
    -- ------------------------------------------------------------------ --
    INSERT INTO gym_checkins (user_id, tenant_id, branch_id, method, xp_earned)
    VALUES (p_user_id, p_tenant_id, p_branch_id, 'app', v_total_xp)
    RETURNING id INTO v_checkin_id;

    -- ------------------------------------------------------------------ --
    -- Update stats (streak, checkin count)
    -- ------------------------------------------------------------------ --
    UPDATE user_game_stats
    SET current_streak    = v_new_streak,
        longest_streak    = GREATEST(longest_streak, v_new_streak),
        last_checkin_date = CURRENT_DATE,
        total_checkins    = total_checkins + 1,
        updated_at        = NOW()
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    -- ------------------------------------------------------------------ --
    -- Award checkin XP
    -- ------------------------------------------------------------------ --
    PERFORM public._gam_award_xp(
        p_user_id, p_tenant_id, v_total_xp,
        'checkin', v_checkin_id
    );

    -- ------------------------------------------------------------------ --
    -- Streak milestone bonus XP
    -- ------------------------------------------------------------------ --
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

    -- ------------------------------------------------------------------ --
    -- Recalculate level
    -- ------------------------------------------------------------------ --
    v_new_level := public._gam_update_level(p_user_id, p_tenant_id);

    -- ------------------------------------------------------------------ --
    -- Badge evaluation (checkin-based badges)
    -- ------------------------------------------------------------------ --
    FOR v_badge IN
        SELECT * FROM badge_definitions
        WHERE tenant_id = p_tenant_id
          AND trigger_type IN ('checkin_count', 'streak')
          AND is_active = TRUE
    LOOP
        DECLARE
            v_already_earned BOOLEAN;
            v_earned         BOOLEAN := FALSE;
            v_current_val    INTEGER;
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM user_badges
                WHERE user_id = p_user_id
                  AND tenant_id = p_tenant_id
                  AND badge_id = v_badge.id
            ) INTO v_already_earned;

            IF NOT v_already_earned THEN
                IF v_badge.trigger_type = 'checkin_count' THEN
                    SELECT total_checkins INTO v_current_val
                    FROM user_game_stats
                    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
                    v_earned := v_current_val >= (v_badge.trigger_value::INTEGER);
                ELSIF v_badge.trigger_type = 'streak' THEN
                    v_earned := v_new_streak >= (v_badge.trigger_value::INTEGER);
                END IF;

                IF v_earned THEN
                    INSERT INTO user_badges (user_id, tenant_id, badge_id)
                    VALUES (p_user_id, p_tenant_id, v_badge.id)
                    ON CONFLICT DO NOTHING;

                    v_badges_json := v_badges_json || jsonb_build_array(v_badge.name);

                    IF v_badge.xp_reward > 0 THEN
                        PERFORM public._gam_award_xp(
                            p_user_id, p_tenant_id, v_badge.xp_reward,
                            'badge', v_checkin_id,
                            'Badge: ' || v_badge.name
                        );
                    END IF;
                END IF;
            END IF;
        END;
    END LOOP;

    -- ------------------------------------------------------------------ --
    -- Return result
    -- ------------------------------------------------------------------ --
    RETURN jsonb_build_object(
        'success',            true,
        'already_checked_in', false,
        'xp_earned',          v_total_xp,
        'new_streak',         v_new_streak,
        'new_badges',         v_badges_json,
        'new_level',          v_new_level
    );
END;
$$;

REVOKE ALL ON FUNCTION public.award_checkin(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_checkin(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_checkin(UUID, UUID, UUID) TO service_role;
