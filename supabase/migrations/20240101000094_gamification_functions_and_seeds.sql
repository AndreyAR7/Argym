-- =============================================================================
-- Migration: 20240101000094_gamification_functions_and_seeds.sql
-- Description: Gamification module — RPC functions, badge/level seeds (1-50)
-- Depends on: 20240101000093_gamification_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Internal helper: _gam_award_xp
-- Inserts an XP transaction and upserts user_game_stats accumulators.
-- Called only by service_role / other SECURITY DEFINER functions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._gam_award_xp(
    p_user_id   UUID,
    p_tenant_id UUID,
    p_amount    INTEGER,
    p_source    TEXT,
    p_source_ref UUID DEFAULT NULL,
    p_note      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Audit log
    INSERT INTO xp_transactions (user_id, tenant_id, amount, source, source_ref, note)
    VALUES (p_user_id, p_tenant_id, p_amount, p_source, p_source_ref, p_note);

    -- Ensure stats row exists, then accumulate
    INSERT INTO user_game_stats (user_id, tenant_id, xp_total, xp_this_week, xp_this_month, updated_at)
    VALUES (p_user_id, p_tenant_id, p_amount, p_amount, p_amount, NOW())
    ON CONFLICT (user_id, tenant_id) DO UPDATE
        SET xp_total      = user_game_stats.xp_total      + p_amount,
            xp_this_week  = user_game_stats.xp_this_week  + p_amount,
            xp_this_month = user_game_stats.xp_this_month + p_amount,
            updated_at    = NOW();
END;
$$;

-- ---------------------------------------------------------------------------
-- Internal helper: _gam_update_level
-- Recalculates and persists the level for a user based on their current xp_total.
-- Returns the new level.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._gam_update_level(
    p_user_id   UUID,
    p_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_xp_total  INTEGER;
    v_new_level INTEGER := 1;
BEGIN
    SELECT xp_total INTO v_xp_total
    FROM user_game_stats
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    IF v_xp_total IS NULL THEN
        RETURN 1;
    END IF;

    SELECT level INTO v_new_level
    FROM level_definitions
    WHERE xp_required <= v_xp_total
    ORDER BY level DESC
    LIMIT 1;

    IF v_new_level IS NULL THEN
        v_new_level := 1;
    END IF;

    UPDATE user_game_stats
    SET level      = v_new_level,
        updated_at = NOW()
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    RETURN v_new_level;
END;
$$;

-- ---------------------------------------------------------------------------
-- Internal helper: _gam_check_badges
-- Evaluates all auto-award badge conditions for a user and awards any newly
-- earned badges. Returns the set of badge_definitions just awarded.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._gam_check_badges(
    p_user_id   UUID,
    p_tenant_id UUID
)
RETURNS SETOF badge_definitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stats  user_game_stats%ROWTYPE;
    v_badge  badge_definitions%ROWTYPE;
    v_met    BOOLEAN;
BEGIN
    -- Fetch current stats; bail early if no row yet
    SELECT * INTO v_stats
    FROM user_game_stats
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Iterate every active, auto-award badge
    FOR v_badge IN
        SELECT bd.*
        FROM badge_definitions bd
        WHERE bd.is_active = TRUE
          AND bd.condition_type IS NOT NULL
          AND bd.condition_type <> 'manual'
          -- Skip badges already earned by this user in this tenant
          AND NOT EXISTS (
              SELECT 1 FROM user_badges ub
              WHERE ub.user_id   = p_user_id
                AND ub.tenant_id = p_tenant_id
                AND ub.badge_id  = bd.id
          )
        ORDER BY bd.sort_order
    LOOP
        v_met := FALSE;

        CASE v_badge.condition_type
            WHEN 'checkin_count'       THEN v_met := v_stats.total_checkins             >= v_badge.condition_value;
            WHEN 'streak'              THEN v_met := v_stats.current_streak              >= v_badge.condition_value;
            WHEN 'challenge_wins'      THEN v_met := v_stats.total_challenges_won        >= v_badge.condition_value;
            WHEN 'challenge_completed' THEN v_met := v_stats.total_challenges_completed  >= v_badge.condition_value;
            WHEN 'level'               THEN v_met := v_stats.level                       >= v_badge.condition_value;
            WHEN 'xp_total'            THEN v_met := v_stats.xp_total                    >= v_badge.condition_value;
            ELSE v_met := FALSE;
        END CASE;

        IF v_met THEN
            -- Award the badge (unique constraint prevents duplicates)
            INSERT INTO user_badges (user_id, tenant_id, badge_id)
            VALUES (p_user_id, p_tenant_id, v_badge.id)
            ON CONFLICT (user_id, tenant_id, badge_id) DO NOTHING;

            -- Only award XP when the badge actually has an xp_reward
            IF v_badge.xp_reward > 0 THEN
                PERFORM public._gam_award_xp(
                    p_user_id, p_tenant_id, v_badge.xp_reward,
                    'badge_earned', v_badge.id,
                    'Badge earned: ' || v_badge.slug
                );
            END IF;

            RETURN NEXT v_badge;
        END IF;
    END LOOP;

    RETURN;
END;
$$;

-- ---------------------------------------------------------------------------
-- Public RPC: award_checkin
-- Records a gym check-in for a user, calculates XP + streak, awards badges.
-- Callable by the user themselves or by service_role (admin tools, QR scanner).
-- ---------------------------------------------------------------------------
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
            'success',           false,
            'error',             'user_not_approved',
            'already_checked_in', false,
            'xp_earned',         0,
            'new_streak',        0,
            'new_badges',        '[]'::JSONB,
            'new_level',         NULL
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
        -- Return current streak so the UI can show it
        SELECT current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success',           false,
            'already_checked_in', true,
            'xp_earned',         0,
            'new_streak',        COALESCE(v_new_streak, 0),
            'new_badges',        '[]'::JSONB,
            'new_level',         NULL
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
        -- Consecutive day — extend streak
        v_new_streak := v_stats.current_streak + 1;
    ELSE
        -- Streak broken (or very first checkin)
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
    -- Streak milestone bonus XP (separate transaction for traceability)
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
    -- Badge check — collect newly awarded badges into JSON array
    -- ------------------------------------------------------------------ --
    FOR v_badge IN
        SELECT * FROM public._gam_check_badges(p_user_id, p_tenant_id)
    LOOP
        v_badges_json := v_badges_json || jsonb_build_object(
            'id',    v_badge.id,
            'slug',  v_badge.slug,
            'name',  v_badge.name,
            'icon',  v_badge.icon,
            'rarity', v_badge.rarity
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success',           true,
        'already_checked_in', false,
        'xp_earned',         v_total_xp,
        'new_streak',        v_new_streak,
        'new_badges',        v_badges_json,
        'new_level',         v_new_level
    );

EXCEPTION
    WHEN unique_violation THEN
        -- Race condition: another call slipped in for the same day
        SELECT current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success',           false,
            'already_checked_in', true,
            'xp_earned',         0,
            'new_streak',        COALESCE(v_new_streak, 0),
            'new_badges',        '[]'::JSONB,
            'new_level',         NULL
        );
END;
$$;

-- ---------------------------------------------------------------------------
-- Public RPC: get_leaderboard
-- Returns ranked users within a tenant, sorted by the requested XP period.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_leaderboard(
    p_tenant_id UUID,
    p_period    TEXT    DEFAULT 'week',
    p_limit     INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank                   BIGINT,
    user_id                UUID,
    full_name              TEXT,
    level                  INTEGER,
    xp_total               INTEGER,
    xp_this_week           INTEGER,
    xp_this_month          INTEGER,
    current_streak         INTEGER,
    total_checkins         INTEGER,
    total_challenges_won   INTEGER,
    is_me                  BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH ordered AS (
        SELECT
            gs.user_id,
            p.full_name,
            gs.level,
            gs.xp_total,
            gs.xp_this_week,
            gs.xp_this_month,
            gs.current_streak,
            gs.total_checkins,
            gs.total_challenges_won,
            gs.user_id = auth.uid() AS is_me,
            ROW_NUMBER() OVER (
                ORDER BY
                    CASE p_period
                        WHEN 'week'  THEN gs.xp_this_week
                        WHEN 'month' THEN gs.xp_this_month
                        ELSE              gs.xp_total
                    END DESC,
                    gs.xp_total DESC   -- stable tie-breaker
            ) AS rank
        FROM user_game_stats gs
        JOIN profiles p
            ON p.id = gs.user_id
           AND p.tenant_id = gs.tenant_id
        WHERE gs.tenant_id = p_tenant_id
          AND p.approval_status = 'approved'
    )
    SELECT
        rank,
        user_id,
        full_name,
        level,
        xp_total,
        xp_this_week,
        xp_this_month,
        current_streak,
        total_checkins,
        total_challenges_won,
        is_me
    FROM ordered
    ORDER BY rank
    LIMIT p_limit;
$$;

-- ---------------------------------------------------------------------------
-- Public RPC: get_user_challenges
-- Returns all challenges visible to the user:
--   • global challenges within the tenant
--   • challenges the user participates in
--   • challenges the user created
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_challenges(
    p_user_id   UUID,
    p_tenant_id UUID
)
RETURNS TABLE (
    id                UUID,
    tenant_id         UUID,
    creator_id        UUID,
    challenge_type    TEXT,
    title             TEXT,
    description       TEXT,
    target_metric     TEXT,
    target_value      INTEGER,
    xp_reward         INTEGER,
    badge_id          UUID,
    promotion_id      UUID,
    status            TEXT,
    starts_at         TIMESTAMPTZ,
    expires_at        TIMESTAMPTZ,
    max_participants  INTEGER,
    created_at        TIMESTAMPTZ,
    creator_name      TEXT,
    participant_count BIGINT,
    my_status         TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        c.id,
        c.tenant_id,
        c.creator_id,
        c.challenge_type,
        c.title,
        c.description,
        c.target_metric,
        c.target_value,
        c.xp_reward,
        c.badge_id,
        c.promotion_id,
        c.status,
        c.starts_at,
        c.expires_at,
        c.max_participants,
        c.created_at,
        creator.full_name                                              AS creator_name,
        COUNT(DISTINCT cp_all.id)                                      AS participant_count,
        my_part.status                                                 AS my_status
    FROM challenges c
    JOIN profiles creator ON creator.id = c.creator_id
    LEFT JOIN challenge_participants cp_all ON cp_all.challenge_id = c.id
    LEFT JOIN challenge_participants my_part
           ON my_part.challenge_id = c.id
          AND my_part.user_id      = p_user_id
    WHERE c.tenant_id = p_tenant_id
      AND c.status    = 'active'
      AND (
          -- Global challenges are visible to everyone in the tenant
             c.challenge_type = 'global'
          -- Challenges the user created
          OR c.creator_id     = p_user_id
          -- Challenges the user participates in (any status)
          OR EXISTS (
              SELECT 1 FROM challenge_participants cp2
              WHERE cp2.challenge_id = c.id
                AND cp2.user_id     = p_user_id
          )
      )
    GROUP BY
        c.id, c.tenant_id, c.creator_id, c.challenge_type,
        c.title, c.description, c.target_metric, c.target_value,
        c.xp_reward, c.badge_id, c.promotion_id, c.status,
        c.starts_at, c.expires_at, c.max_participants, c.created_at,
        creator.full_name, my_part.status
    ORDER BY c.created_at DESC;
$$;

-- ---------------------------------------------------------------------------
-- Public RPC: complete_challenge_entry
-- Marks a participant as having completed a challenge, awards XP and badges.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_challenge_entry(
    p_challenge_id UUID,
    p_user_id      UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_challenge       challenges%ROWTYPE;
    v_participant     challenge_participants%ROWTYPE;
    v_tenant_id       UUID;
    v_xp_reward       INTEGER;
    v_new_level       INTEGER;
    v_badge           badge_definitions%ROWTYPE;
    v_badges_json     JSONB  := '[]'::JSONB;
    v_is_first_winner BOOLEAN;
BEGIN
    -- ------------------------------------------------------------------ --
    -- Fetch challenge
    -- ------------------------------------------------------------------ --
    SELECT * INTO v_challenge
    FROM challenges
    WHERE id = p_challenge_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'challenge_not_found');
    END IF;

    v_tenant_id := v_challenge.tenant_id;
    v_xp_reward := COALESCE(v_challenge.xp_reward, 100);

    -- ------------------------------------------------------------------ --
    -- Fetch participant row — must be pending or accepted
    -- ------------------------------------------------------------------ --
    SELECT * INTO v_participant
    FROM challenge_participants
    WHERE challenge_id = p_challenge_id
      AND user_id      = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_a_participant');
    END IF;

    IF v_participant.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_completed');
    END IF;

    IF v_participant.status NOT IN ('pending', 'accepted') THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_participant_status');
    END IF;

    -- ------------------------------------------------------------------ --
    -- Mark participant completed
    -- ------------------------------------------------------------------ --
    UPDATE challenge_participants
    SET status       = 'completed',
        completed_at = NOW(),
        progress     = v_challenge.target_value
    WHERE challenge_id = p_challenge_id
      AND user_id      = p_user_id;

    -- ------------------------------------------------------------------ --
    -- Update aggregate stats
    -- ------------------------------------------------------------------ --
    INSERT INTO user_game_stats (user_id, tenant_id, total_challenges_completed)
    VALUES (p_user_id, v_tenant_id, 1)
    ON CONFLICT (user_id, tenant_id) DO UPDATE
        SET total_challenges_completed = user_game_stats.total_challenges_completed + 1,
            updated_at                 = NOW();

    -- ------------------------------------------------------------------ --
    -- Award completion XP
    -- ------------------------------------------------------------------ --
    PERFORM public._gam_award_xp(
        p_user_id, v_tenant_id, v_xp_reward,
        'challenge_completed', p_challenge_id
    );

    -- ------------------------------------------------------------------ --
    -- 1v1: first completer wins — award win stats + bonus XP
    -- ------------------------------------------------------------------ --
    IF v_challenge.challenge_type = '1v1' THEN
        -- This user is the first to reach 'completed' status (we just set it)
        v_is_first_winner := NOT EXISTS (
            SELECT 1 FROM challenge_participants
            WHERE challenge_id = p_challenge_id
              AND status       = 'completed'
              AND user_id     <> p_user_id
        );

        IF v_is_first_winner THEN
            UPDATE user_game_stats
            SET total_challenges_won = total_challenges_won + 1,
                updated_at           = NOW()
            WHERE user_id   = p_user_id
              AND tenant_id = v_tenant_id;

            PERFORM public._gam_award_xp(
                p_user_id, v_tenant_id, 50,
                'challenge_won', p_challenge_id,
                '1v1 challenge victory bonus'
            );
        END IF;
    END IF;

    -- ------------------------------------------------------------------ --
    -- Recalculate level
    -- ------------------------------------------------------------------ --
    v_new_level := public._gam_update_level(p_user_id, v_tenant_id);

    -- ------------------------------------------------------------------ --
    -- Award challenge-specific badge if defined
    -- ------------------------------------------------------------------ --
    IF v_challenge.badge_id IS NOT NULL THEN
        INSERT INTO user_badges (user_id, tenant_id, badge_id)
        VALUES (p_user_id, v_tenant_id, v_challenge.badge_id)
        ON CONFLICT (user_id, tenant_id, badge_id) DO NOTHING;

        -- Include challenge badge in result if just awarded
        IF FOUND THEN
            SELECT * INTO v_badge
            FROM badge_definitions
            WHERE id = v_challenge.badge_id;

            IF FOUND THEN
                v_badges_json := v_badges_json || jsonb_build_object(
                    'id',     v_badge.id,
                    'slug',   v_badge.slug,
                    'name',   v_badge.name,
                    'icon',   v_badge.icon,
                    'rarity', v_badge.rarity
                );
            END IF;
        END IF;
    END IF;

    -- ------------------------------------------------------------------ --
    -- General badge check
    -- ------------------------------------------------------------------ --
    FOR v_badge IN
        SELECT * FROM public._gam_check_badges(p_user_id, v_tenant_id)
    LOOP
        -- Avoid duplicate if challenge badge already appended
        IF NOT (v_badges_json @> jsonb_build_array(jsonb_build_object('id', v_badge.id))) THEN
            v_badges_json := v_badges_json || jsonb_build_object(
                'id',     v_badge.id,
                'slug',   v_badge.slug,
                'name',   v_badge.name,
                'icon',   v_badge.icon,
                'rarity', v_badge.rarity
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success',      true,
        'xp_earned',    v_xp_reward,
        'badges_earned', v_badges_json,
        'new_level',    v_new_level
    );
END;
$$;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ---------------------------------------------------------------------------
-- badge_definitions — 25 badges
-- Migration 093 already inserted some; use ON CONFLICT DO NOTHING throughout.
-- ---------------------------------------------------------------------------
INSERT INTO badge_definitions
    (slug, name, description, icon, xp_reward, rarity, condition_type, condition_value, sort_order)
VALUES
    -- Check-in count milestones (5 badges) ---------------------------------
    ('first_checkin',    'Primer Paso',       'Completaste tu primer check-in',    '👟',  50,    'common',    'checkin_count',       1,    10),
    ('checkin_7',        'Una Semana',         '7 check-ins en el gimnasio',        '🏃',  75,    'common',    'checkin_count',       7,    15),
    ('checkin_30',       'Un Mes Completo',    '30 check-ins en el gimnasio',       '💪',  150,   'common',    'checkin_count',      30,    20),
    ('checkin_100',      'Century Club',       '100 check-ins en el gimnasio',      '🏆',  500,   'epic',      'checkin_count',     100,    30),
    ('checkin_365',      'Guerrero del Año',   '365 check-ins en el gimnasio',      '🦅', 1000,   'legendary', 'checkin_count',     365,    40),

    -- Streak milestones (5 badges) -----------------------------------------
    ('streak_3',         'Tres en Raya',       'Racha de 3 días consecutivos',      '🌱',  25,    'common',    'streak',              3,    50),
    ('streak_7',         'Semana de Fuego',    'Racha de 7 días consecutivos',      '🔥', 100,    'common',    'streak',              7,    60),
    ('streak_14',        'Dos Semanas',        'Racha de 14 días consecutivos',     '⚡', 200,    'rare',      'streak',             14,    65),
    ('streak_30',        'Imparable',          'Racha de 30 días consecutivos',     '💎', 300,    'rare',      'streak',             30,    70),
    ('streak_100',       'Cien Días de Gloria','Racha de 100 días consecutivos',    '🌟', 750,    'epic',      'streak',            100,    80),

    -- Challenge wins (4 badges) --------------------------------------------
    ('challenge_win_1',  'Primera Sangre',     'Ganaste tu primer desafío',         '⚔️', 100,   'common',    'challenge_wins',       1,   100),
    ('challenge_win_5',  'Retador',            'Ganaste 5 desafíos',                '🥈', 200,   'rare',      'challenge_wins',       5,   105),
    ('challenge_win_10', 'Desafiante',         'Ganaste 10 desafíos',               '🥇', 300,   'epic',      'challenge_wins',      10,   110),
    ('challenge_win_25', 'Conquistador',       'Ganaste 25 desafíos',               '👑', 750,   'legendary', 'challenge_wins',      25,   120),

    -- Level milestones (4 badges) ------------------------------------------
    ('level_5',          'Nivel 5',            'Alcanzaste el nivel 5',             '⭐', 150,   'common',    'level',               5,   130),
    ('level_10',         'Nivel 10',           'Alcanzaste el nivel 10',            '🌠', 400,   'rare',      'level',              10,   140),
    ('level_25',         'Nivel 25',           'Alcanzaste el nivel 25',            '🚀', 800,   'epic',      'level',              25,   150),
    ('level_50',         'Campeón Máximo',     'Alcanzaste el nivel máximo 50',     '🔮',2000,   'legendary', 'level',              50,   160),

    -- XP milestones (3 badges) ---------------------------------------------
    ('xp_1000',          'Inicio Prometedor',  'Ganaste 1,000 XP en total',         '✨',   0,   'common',    'xp_total',          1000,  170),
    ('xp_10000',         'Cazador de XP',      'Ganaste 10,000 XP en total',        '💫',   0,   'rare',      'xp_total',         10000,  180),
    ('xp_50000',         'Maestro de XP',      'Ganaste 50,000 XP en total',        '🌌',   0,   'epic',      'xp_total',         50000,  190),

    -- Challenges completed (2 badges) --------------------------------------
    ('challenge_done_1', 'Primera Misión',     'Completaste tu primer desafío',     '🎯',  75,   'common',    'challenge_completed', 1,   200),
    ('challenge_done_10','Misionero',          'Completaste 10 desafíos',           '🎖️', 250,  'rare',      'challenge_completed',10,   210),

    -- Manual / special (2 badges) -----------------------------------------
    ('legend',           'Leyenda',            'Reconocimiento especial del admin',  '🏅',   0,  'legendary', 'manual',           NULL,  500),
    ('ambassador',       'Embajador',          'Representante oficial del gimnasio', '🌍',   0,  'legendary', 'manual',           NULL,  510)

ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- level_definitions — levels 1-50
-- Formula: xp_required = ROUND(100 * level^1.8)  (level 1 = 0)
-- Names:   1-5  Principiante | 6-10  Constante | 11-20 Dedicado
--          21-30 Atleta      | 31-40 Guerrero   | 41-50 Campeón
-- Colors:  1-5  gray | 6-10  blue  | 11-20 purple
--          21-30 amber | 31-40 orange | 41-50 red
-- Unlocks: level 5  → can_create_challenges
--          level 10 → exclusive_routines
--          level 20 → streak_shield
--          level 25 → ambassador
-- ---------------------------------------------------------------------------
INSERT INTO level_definitions (level, xp_required, name, color, unlocks)
VALUES
    -- Principiante (#gray) -------------------------------------------------
    ( 1,         0, 'Principiante I',   '#9E9E9E', '[]'::JSONB),
    ( 2,       191, 'Principiante II',  '#9E9E9E', '[]'::JSONB),
    ( 3,       438, 'Principiante III', '#9E9E9E', '[]'::JSONB),
    ( 4,       741, 'Principiante IV',  '#9E9E9E', '[]'::JSONB),
    ( 5,      1097, 'Principiante V',   '#9E9E9E', '["can_create_challenges"]'::JSONB),

    -- Constante (#blue) ----------------------------------------------------
    ( 6,      1503, 'Constante I',      '#2196F3', '[]'::JSONB),
    ( 7,      1957, 'Constante II',     '#2196F3', '[]'::JSONB),
    ( 8,      2458, 'Constante III',    '#2196F3', '[]'::JSONB),
    ( 9,      3003, 'Constante IV',     '#2196F3', '[]'::JSONB),
    (10,      3594, 'Constante V',      '#2196F3', '["exclusive_routines"]'::JSONB),

    -- Dedicado (#purple) ---------------------------------------------------
    (11,      4228, 'Dedicado I',       '#9C27B0', '[]'::JSONB),
    (12,      4905, 'Dedicado II',      '#9C27B0', '[]'::JSONB),
    (13,      5624, 'Dedicado III',     '#9C27B0', '[]'::JSONB),
    (14,      6385, 'Dedicado IV',      '#9C27B0', '[]'::JSONB),
    (15,      7188, 'Dedicado V',       '#9C27B0', '[]'::JSONB),
    (16,      8031, 'Dedicado VI',      '#9C27B0', '[]'::JSONB),
    (17,      8915, 'Dedicado VII',     '#9C27B0', '[]'::JSONB),
    (18,      9839, 'Dedicado VIII',    '#9C27B0', '[]'::JSONB),
    (19,     10803, 'Dedicado IX',      '#9C27B0', '[]'::JSONB),
    (20,     11806, 'Dedicado X',       '#9C27B0', '["streak_shield"]'::JSONB),

    -- Atleta (#amber) ------------------------------------------------------
    (21,     12849, 'Atleta I',         '#FFC107', '[]'::JSONB),
    (22,     13931, 'Atleta II',        '#FFC107', '[]'::JSONB),
    (23,     15052, 'Atleta III',       '#FFC107', '[]'::JSONB),
    (24,     16211, 'Atleta IV',        '#FFC107', '[]'::JSONB),
    (25,     17409, 'Atleta V',         '#FFC107', '["ambassador"]'::JSONB),
    (26,     18645, 'Atleta VI',        '#FFC107', '[]'::JSONB),
    (27,     19920, 'Atleta VII',       '#FFC107', '[]'::JSONB),
    (28,     21232, 'Atleta VIII',      '#FFC107', '[]'::JSONB),
    (29,     22582, 'Atleta IX',        '#FFC107', '[]'::JSONB),
    (30,     23969, 'Atleta X',         '#FFC107', '[]'::JSONB),

    -- Guerrero (#orange) ---------------------------------------------------
    (31,     25394, 'Guerrero I',       '#FF5722', '[]'::JSONB),
    (32,     26856, 'Guerrero II',      '#FF5722', '[]'::JSONB),
    (33,     28356, 'Guerrero III',     '#FF5722', '[]'::JSONB),
    (34,     29893, 'Guerrero IV',      '#FF5722', '[]'::JSONB),
    (35,     31467, 'Guerrero V',       '#FF5722', '[]'::JSONB),
    (36,     33077, 'Guerrero VI',      '#FF5722', '[]'::JSONB),
    (37,     34725, 'Guerrero VII',     '#FF5722', '[]'::JSONB),
    (38,     36410, 'Guerrero VIII',    '#FF5722', '[]'::JSONB),
    (39,     38131, 'Guerrero IX',      '#FF5722', '[]'::JSONB),
    (40,     39889, 'Guerrero X',       '#FF5722', '[]'::JSONB),

    -- Campeón (#red) -------------------------------------------------------
    (41,     41683, 'Campeón I',        '#F44336', '[]'::JSONB),
    (42,     43514, 'Campeón II',       '#F44336', '[]'::JSONB),
    (43,     45382, 'Campeón III',      '#F44336', '[]'::JSONB),
    (44,     47286, 'Campeón IV',       '#F44336', '[]'::JSONB),
    (45,     49226, 'Campeón V',        '#F44336', '[]'::JSONB),
    (46,     51202, 'Campeón VI',       '#F44336', '[]'::JSONB),
    (47,     53215, 'Campeón VII',      '#F44336', '[]'::JSONB),
    (48,     55264, 'Campeón VIII',     '#F44336', '[]'::JSONB),
    (49,     57349, 'Campeón IX',       '#F44336', '[]'::JSONB),
    (50,     59470, 'Campeón X',        '#F44336', '[]'::JSONB)

ON CONFLICT (level) DO NOTHING;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Public RPCs: authenticated users + service_role only
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.award_checkin(UUID, UUID, UUID)           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard(UUID, TEXT, INTEGER)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_challenges(UUID, UUID)           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_challenge_entry(UUID, UUID)      FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.award_checkin(UUID, UUID, UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_checkin(UUID, UUID, UUID)        TO service_role;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(UUID, TEXT, INTEGER)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(UUID, TEXT, INTEGER)   TO service_role;

GRANT EXECUTE ON FUNCTION public.get_user_challenges(UUID, UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_challenges(UUID, UUID)        TO service_role;

GRANT EXECUTE ON FUNCTION public.complete_challenge_entry(UUID, UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_challenge_entry(UUID, UUID)   TO service_role;

-- ---------------------------------------------------------------------------
-- Internal helpers: service_role only — revoke from all others
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public._gam_award_xp(UUID, UUID, INTEGER, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._gam_award_xp(UUID, UUID, INTEGER, TEXT, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public._gam_award_xp(UUID, UUID, INTEGER, TEXT, UUID, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public._gam_award_xp(UUID, UUID, INTEGER, TEXT, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public._gam_update_level(UUID, UUID)       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._gam_update_level(UUID, UUID)   FROM anon;
REVOKE EXECUTE ON FUNCTION public._gam_update_level(UUID, UUID)   FROM authenticated;
GRANT  EXECUTE ON FUNCTION public._gam_update_level(UUID, UUID)   TO service_role;

REVOKE ALL ON FUNCTION public._gam_check_badges(UUID, UUID)       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._gam_check_badges(UUID, UUID)   FROM anon;
REVOKE EXECUTE ON FUNCTION public._gam_check_badges(UUID, UUID)   FROM authenticated;
GRANT  EXECUTE ON FUNCTION public._gam_check_badges(UUID, UUID)   TO service_role;
