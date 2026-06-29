-- =============================================================================
-- Migration: 20240101000093_gamification_schema.sql
-- Description: Gamification module — XP, levels, badges, challenges, check-ins
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. badge_definitions  (global — no tenant_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badge_definitions (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    slug            TEXT        NOT NULL UNIQUE,
    name            TEXT        NOT NULL,
    description     TEXT,
    icon            TEXT        NOT NULL,
    xp_reward       INTEGER     DEFAULT 0,
    rarity          TEXT        DEFAULT 'common'
                                CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    condition_type  TEXT        CHECK (condition_type IN (
                                    'checkin_count', 'streak', 'challenge_wins',
                                    'challenge_completed', 'level', 'xp_total', 'manual'
                                )),
    condition_value INTEGER,
    sort_order      INTEGER     DEFAULT 0,
    is_active       BOOLEAN     DEFAULT TRUE
);

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'badge_definitions' AND policyname = 'badge_definitions_select_authenticated'
    ) THEN
        CREATE POLICY badge_definitions_select_authenticated
            ON badge_definitions
            FOR SELECT
            TO authenticated
            USING (TRUE);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'badge_definitions' AND policyname = 'badge_definitions_write_service_role'
    ) THEN
        CREATE POLICY badge_definitions_write_service_role
            ON badge_definitions
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. level_definitions  (global — no tenant_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS level_definitions (
    level        INTEGER PRIMARY KEY,
    xp_required  INTEGER NOT NULL,
    name         TEXT    NOT NULL,
    color        TEXT    NOT NULL,
    unlocks      JSONB   DEFAULT '[]'::JSONB
);

ALTER TABLE level_definitions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'level_definitions' AND policyname = 'level_definitions_select_authenticated'
    ) THEN
        CREATE POLICY level_definitions_select_authenticated
            ON level_definitions
            FOR SELECT
            TO authenticated
            USING (TRUE);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. user_game_stats  (one row per user+tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_game_stats (
    user_id                    UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    tenant_id                  UUID        NOT NULL,
    xp_total                   INTEGER     DEFAULT 0,
    xp_this_week               INTEGER     DEFAULT 0,
    xp_this_month              INTEGER     DEFAULT 0,
    level                      INTEGER     DEFAULT 1,
    current_streak             INTEGER     DEFAULT 0,
    longest_streak             INTEGER     DEFAULT 0,
    last_checkin_date          DATE,
    total_checkins             INTEGER     DEFAULT 0,
    total_challenges_completed INTEGER     DEFAULT 0,
    total_challenges_won       INTEGER     DEFAULT 0,
    streak_shield_count        INTEGER     DEFAULT 0,
    updated_at                 TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS user_game_stats_tenant_id_idx ON user_game_stats (tenant_id);
CREATE INDEX IF NOT EXISTS user_game_stats_xp_total_idx  ON user_game_stats (tenant_id, xp_total DESC);

ALTER TABLE user_game_stats ENABLE ROW LEVEL SECURITY;

-- User sees / inserts / updates their own row
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_game_stats' AND policyname = 'user_game_stats_own_select'
    ) THEN
        CREATE POLICY user_game_stats_own_select
            ON user_game_stats
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_game_stats' AND policyname = 'user_game_stats_own_insert'
    ) THEN
        CREATE POLICY user_game_stats_own_insert
            ON user_game_stats
            FOR INSERT
            TO authenticated
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_game_stats' AND policyname = 'user_game_stats_own_update'
    ) THEN
        CREATE POLICY user_game_stats_own_update
            ON user_game_stats
            FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Admin sees / modifies all rows within their tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_game_stats' AND policyname = 'user_game_stats_admin_all'
    ) THEN
        CREATE POLICY user_game_stats_admin_all
            ON user_game_stats
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE p.id = auth.uid()
                      AND p.tenant_id = user_game_stats.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles p
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE p.id = auth.uid()
                      AND p.tenant_id = user_game_stats.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            );
    END IF;
END $$;

-- Service role unrestricted
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_game_stats' AND policyname = 'user_game_stats_service_role'
    ) THEN
        CREATE POLICY user_game_stats_service_role
            ON user_game_stats
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. xp_transactions  (audit log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS xp_transactions (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    tenant_id  UUID        NOT NULL,
    amount     INTEGER     NOT NULL,
    source     TEXT        NOT NULL
                           CHECK (source IN (
                               'checkin', 'challenge_won', 'challenge_completed',
                               'badge_earned', 'streak_milestone', 'routine_completed',
                               'admin_award'
                           )),
    source_ref UUID,
    note       TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS xp_transactions_user_id_idx    ON xp_transactions (user_id);
CREATE INDEX IF NOT EXISTS xp_transactions_tenant_id_idx  ON xp_transactions (tenant_id);
CREATE INDEX IF NOT EXISTS xp_transactions_created_at_idx ON xp_transactions (tenant_id, created_at DESC);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'xp_transactions' AND policyname = 'xp_transactions_own_select'
    ) THEN
        CREATE POLICY xp_transactions_own_select
            ON xp_transactions
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'xp_transactions' AND policyname = 'xp_transactions_admin_select'
    ) THEN
        CREATE POLICY xp_transactions_admin_select
            ON xp_transactions
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE p.id = auth.uid()
                      AND p.tenant_id = xp_transactions.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'xp_transactions' AND policyname = 'xp_transactions_service_role'
    ) THEN
        CREATE POLICY xp_transactions_service_role
            ON xp_transactions
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. user_badges  (earned badges per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_badges (
    id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id   UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    tenant_id UUID        NOT NULL,
    badge_id  UUID        NOT NULL REFERENCES badge_definitions (id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, tenant_id, badge_id)
);

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx   ON user_badges (user_id);
CREATE INDEX IF NOT EXISTS user_badges_tenant_id_idx ON user_badges (tenant_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_id_idx  ON user_badges (badge_id);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_badges' AND policyname = 'user_badges_own_select'
    ) THEN
        CREATE POLICY user_badges_own_select
            ON user_badges
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_badges' AND policyname = 'user_badges_admin_all'
    ) THEN
        CREATE POLICY user_badges_admin_all
            ON user_badges
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE p.id = auth.uid()
                      AND p.tenant_id = user_badges.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles p
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE p.id = auth.uid()
                      AND p.tenant_id = user_badges.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_badges' AND policyname = 'user_badges_service_role'
    ) THEN
        CREATE POLICY user_badges_service_role
            ON user_badges
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenges (
    id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id        UUID        NOT NULL,
    creator_id       UUID        NOT NULL REFERENCES profiles (id) ON DELETE SET NULL,
    challenge_type   TEXT        DEFAULT '1v1'
                                 CHECK (challenge_type IN ('global', '1v1', 'group')),
    title            TEXT        NOT NULL,
    description      TEXT,
    target_metric    TEXT        DEFAULT 'honor'
                                 CHECK (target_metric IN ('checkins', 'honor', 'routine')),
    target_value     INTEGER     DEFAULT 1,
    xp_reward        INTEGER     DEFAULT 100,
    badge_id         UUID        REFERENCES badge_definitions (id) ON DELETE SET NULL,
    promotion_id     UUID        REFERENCES promotions (id) ON DELETE SET NULL,
    status           TEXT        DEFAULT 'active'
                                 CHECK (status IN ('draft', 'active', 'completed', 'expired')),
    starts_at        TIMESTAMPTZ DEFAULT NOW(),
    expires_at       TIMESTAMPTZ,
    max_participants INTEGER,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS challenges_tenant_id_idx  ON challenges (tenant_id);
CREATE INDEX IF NOT EXISTS challenges_creator_id_idx ON challenges (creator_id);
CREATE INDEX IF NOT EXISTS challenges_status_idx     ON challenges (tenant_id, status);
CREATE INDEX IF NOT EXISTS challenges_created_at_idx ON challenges (tenant_id, created_at DESC);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- All authenticated users in the tenant can read challenges
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenges' AND policyname = 'challenges_tenant_select'
    ) THEN
        CREATE POLICY challenges_tenant_select
            ON challenges
            FOR SELECT
            TO authenticated
            USING (
                tenant_id IN (
                    SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
                )
            );
    END IF;
END $$;

-- Creator can update/delete their own challenge
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenges' AND policyname = 'challenges_creator_write'
    ) THEN
        CREATE POLICY challenges_creator_write
            ON challenges
            FOR ALL
            TO authenticated
            USING (creator_id = auth.uid())
            WITH CHECK (creator_id = auth.uid());
    END IF;
END $$;

-- Admin can do everything within their tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenges' AND policyname = 'challenges_admin_all'
    ) THEN
        CREATE POLICY challenges_admin_all
            ON challenges
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE p.id = auth.uid()
                      AND p.tenant_id = challenges.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles p
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE p.id = auth.uid()
                      AND p.tenant_id = challenges.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenges' AND policyname = 'challenges_service_role'
    ) THEN
        CREATE POLICY challenges_service_role
            ON challenges
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. challenge_participants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challenge_participants (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    challenge_id UUID        NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    invited_by   UUID        REFERENCES profiles (id) ON DELETE SET NULL,
    status       TEXT        DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'failed')),
    progress     INTEGER     DEFAULT 0,
    completed_at TIMESTAMPTZ,
    joined_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS challenge_participants_challenge_id_idx ON challenge_participants (challenge_id);
CREATE INDEX IF NOT EXISTS challenge_participants_user_id_idx      ON challenge_participants (user_id);

ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- User sees their own participation rows
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenge_participants' AND policyname = 'challenge_participants_own_select'
    ) THEN
        CREATE POLICY challenge_participants_own_select
            ON challenge_participants
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

-- User can insert/update their own participation
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenge_participants' AND policyname = 'challenge_participants_own_write'
    ) THEN
        CREATE POLICY challenge_participants_own_write
            ON challenge_participants
            FOR INSERT
            TO authenticated
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenge_participants' AND policyname = 'challenge_participants_own_update'
    ) THEN
        CREATE POLICY challenge_participants_own_update
            ON challenge_participants
            FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Challenge creator sees all participants of their challenges
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenge_participants' AND policyname = 'challenge_participants_creator_select'
    ) THEN
        CREATE POLICY challenge_participants_creator_select
            ON challenge_participants
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM challenges c
                    WHERE c.id = challenge_participants.challenge_id
                      AND c.creator_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Admin sees all participants in their tenant's challenges
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenge_participants' AND policyname = 'challenge_participants_admin_all'
    ) THEN
        CREATE POLICY challenge_participants_admin_all
            ON challenge_participants
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM challenges c
                    JOIN profiles p    ON TRUE
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE c.id = challenge_participants.challenge_id
                      AND p.id = auth.uid()
                      AND p.tenant_id = c.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM challenges c
                    JOIN profiles p    ON TRUE
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE c.id = challenge_participants.challenge_id
                      AND p.id = auth.uid()
                      AND p.tenant_id = c.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'challenge_participants' AND policyname = 'challenge_participants_service_role'
    ) THEN
        CREATE POLICY challenge_participants_service_role
            ON challenge_participants
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. gym_checkins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gym_checkins (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    tenant_id     UUID        NOT NULL,
    branch_id     UUID        REFERENCES branches (id) ON DELETE SET NULL,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    method        TEXT        DEFAULT 'app'
                              CHECK (method IN ('qr', 'manual', 'app')),
    xp_earned     INTEGER     DEFAULT 50
);

-- One check-in per user per tenant per calendar day
CREATE UNIQUE INDEX IF NOT EXISTS gym_checkins_one_per_day_idx
    ON gym_checkins (user_id, tenant_id, ((checked_in_at AT TIME ZONE 'UTC')::DATE));

CREATE INDEX IF NOT EXISTS gym_checkins_user_id_idx       ON gym_checkins (user_id);
CREATE INDEX IF NOT EXISTS gym_checkins_tenant_id_idx     ON gym_checkins (tenant_id);
CREATE INDEX IF NOT EXISTS gym_checkins_branch_id_idx     ON gym_checkins (branch_id);
CREATE INDEX IF NOT EXISTS gym_checkins_checked_in_at_idx ON gym_checkins (tenant_id, checked_in_at DESC);

ALTER TABLE gym_checkins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'gym_checkins' AND policyname = 'gym_checkins_own_select'
    ) THEN
        CREATE POLICY gym_checkins_own_select
            ON gym_checkins
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'gym_checkins' AND policyname = 'gym_checkins_own_insert'
    ) THEN
        CREATE POLICY gym_checkins_own_insert
            ON gym_checkins
            FOR INSERT
            TO authenticated
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'gym_checkins' AND policyname = 'gym_checkins_admin_all'
    ) THEN
        CREATE POLICY gym_checkins_admin_all
            ON gym_checkins
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles p
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE p.id = auth.uid()
                      AND p.tenant_id = gym_checkins.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles p
                    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
                    JOIN roles r       ON r.id = ur.role_id
                    WHERE p.id = auth.uid()
                      AND p.tenant_id = gym_checkins.tenant_id
                      AND r.name IN ('admin', 'superadmin')
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'gym_checkins' AND policyname = 'gym_checkins_service_role'
    ) THEN
        CREATE POLICY gym_checkins_service_role
            ON gym_checkins
            FOR ALL
            TO service_role
            USING (TRUE)
            WITH CHECK (TRUE);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Seed: level_definitions (1–20)
-- ---------------------------------------------------------------------------
INSERT INTO level_definitions (level, xp_required, name, color, unlocks)
VALUES
    (1,      0,    'Novice',        '#9E9E9E', '[]'),
    (2,    200,    'Beginner',      '#8BC34A', '[]'),
    (3,    500,    'Apprentice',    '#4CAF50', '[]'),
    (4,    900,    'Trainee',       '#00BCD4', '[]'),
    (5,   1400,    'Athlete',       '#03A9F4', '["streak_shield"]'),
    (6,   2000,    'Contender',     '#2196F3', '[]'),
    (7,   2750,    'Fighter',       '#3F51B5', '[]'),
    (8,   3650,    'Warrior',       '#673AB7', '[]'),
    (9,   4700,    'Champion',      '#9C27B0', '[]'),
    (10,  6000,    'Elite',         '#E91E63', '["challenge_create"]'),
    (11,  7500,    'Master',        '#F44336', '[]'),
    (12,  9200,    'Grand Master',  '#FF5722', '[]'),
    (13, 11100,    'Legend',        '#FF9800', '[]'),
    (14, 13200,    'Mythic',        '#FFC107', '[]'),
    (15, 15600,    'Immortal',      '#FFEB3B', '["custom_badge"]'),
    (16, 18300,    'Titan',         '#CDDC39', '[]'),
    (17, 21300,    'Demigod',       '#8BC34A', '[]'),
    (18, 24700,    'Deity',         '#4CAF50', '[]'),
    (19, 28500,    'Ascendant',     '#00BCD4', '[]'),
    (20, 33000,    'Transcendent',  '#FFD700', '["all_unlocks"]')
ON CONFLICT (level) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed: badge_definitions
-- ---------------------------------------------------------------------------
INSERT INTO badge_definitions (slug, name, description, icon, xp_reward, rarity, condition_type, condition_value, sort_order)
VALUES
    -- Check-in badges
    ('first_checkin',       'First Step',         'Completed your first gym check-in',      '👟', 50,   'common',    'checkin_count', 1,   10),
    ('checkin_10',          'Showing Up',         '10 gym check-ins',                       '🏃', 100,  'common',    'checkin_count', 10,  20),
    ('checkin_50',          'Dedicated',          '50 gym check-ins',                       '💪', 250,  'rare',      'checkin_count', 50,  30),
    ('checkin_100',         'Century Club',       '100 gym check-ins',                      '🏆', 500,  'epic',      'checkin_count', 100, 40),
    ('checkin_365',         'Year Warrior',       '365 gym check-ins',                      '🦅', 1000, 'legendary', 'checkin_count', 365, 50),
    -- Streak badges
    ('streak_7',            'Week Warrior',       '7-day check-in streak',                  '🔥', 100,  'common',    'streak',        7,   60),
    ('streak_30',           'Monthly Grinder',    '30-day check-in streak',                 '⚡', 300,  'rare',      'streak',        30,  70),
    ('streak_100',          'Triple Digits',      '100-day check-in streak',                '💎', 750,  'epic',      'streak',        100, 80),
    ('streak_365',          'Unstoppable',        '365-day check-in streak',                '🌟', 2000, 'legendary', 'streak',        365, 90),
    -- Challenge badges
    ('first_challenge_win', 'First Blood',        'Won your first challenge',               '⚔️',  100,  'common',    'challenge_wins', 1,  100),
    ('challenge_wins_10',   'Challenger',         'Won 10 challenges',                      '🥇', 300,  'rare',      'challenge_wins', 10, 110),
    ('challenge_wins_50',   'Conqueror',          'Won 50 challenges',                      '👑', 750,  'epic',      'challenge_wins', 50, 120),
    -- Level badges
    ('level_5',             'Level Up: 5',        'Reached level 5',                        '⭐', 150,  'common',    'level',         5,   130),
    ('level_10',            'Level Up: 10',       'Reached level 10',                       '🌠', 400,  'rare',      'level',         10,  140),
    ('level_15',            'Level Up: 15',       'Reached level 15',                       '🚀', 800,  'epic',      'level',         15,  150),
    ('level_20',            'Transcendent',       'Reached maximum level 20',               '🔮', 2000, 'legendary', 'level',         20,  160),
    -- XP milestones
    ('xp_1000',             'Getting Started',    'Earned 1,000 total XP',                  '✨', 0,    'common',    'xp_total',      1000,  170),
    ('xp_10000',            'XP Hunter',          'Earned 10,000 total XP',                 '💫', 0,    'rare',      'xp_total',      10000, 180),
    ('xp_50000',            'XP Master',          'Earned 50,000 total XP',                 '🌌', 0,    'epic',      'xp_total',      50000, 190)
ON CONFLICT (slug) DO NOTHING;
