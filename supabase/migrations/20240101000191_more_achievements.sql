-- Expands the achievements/badges catalog and fixes two gaps found while
-- designing the new ones:
--
-- 1. _gam_check_badges() is only called from award_gym_checkin() and
--    complete_challenge_entry() — award_app_checkin() (the in-app "check
--    in today" button) never calls it, and hardcodes 'new_badges': '[]'
--    in its return value. app_current_streak/app_total_checkins are
--    tracked in user_game_stats but were functionally orphaned from the
--    whole badge system. Fixed by wiring the same badge-check + XP-
--    award flow into award_app_checkin() that award_gym_checkin() already
--    has.
-- 2. _gam_check_badges()'s condition_type CASE only recognized 6 values
--    tied to columns that already existed on user_game_stats. Adding
--    badges based on app engagement, appointment attendance, or body
--    measurement logging needs 4 new condition_type values, computed via
--    a one-time subquery per call (not a stats column), so the function
--    is rewritten to compute those once up front.

ALTER TABLE public.badge_definitions DROP CONSTRAINT IF EXISTS badge_definitions_condition_type_check;
ALTER TABLE public.badge_definitions ADD CONSTRAINT badge_definitions_condition_type_check
  CHECK (condition_type IN (
    'checkin_count', 'streak', 'challenge_wins', 'challenge_completed', 'level', 'xp_total',
    'app_checkin_count', 'app_streak', 'appointments_completed', 'measurements_logged', 'manual'
  ));

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
    v_stats                   user_game_stats%ROWTYPE;
    v_badge                   badge_definitions%ROWTYPE;
    v_met                     BOOLEAN;
    v_appointments_completed  INT;
    v_measurements_logged     INT;
BEGIN
    SELECT * INTO v_stats
    FROM user_game_stats
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT
      (SELECT COUNT(*) FROM public.appointments
        WHERE client_id = p_user_id AND tenant_id = p_tenant_id AND status = 'completed')
      +
      (SELECT COUNT(*) FROM public.appointment_participants
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id AND status = 'attended'),
      (SELECT COUNT(*) FROM public.body_measurements
        WHERE client_id = p_user_id AND tenant_id = p_tenant_id)
    INTO v_appointments_completed, v_measurements_logged;

    FOR v_badge IN
        SELECT bd.*
        FROM badge_definitions bd
        WHERE bd.is_active = TRUE
          AND bd.condition_type IS NOT NULL
          AND bd.condition_type <> 'manual'
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
            WHEN 'checkin_count'          THEN v_met := v_stats.total_checkins            >= v_badge.condition_value;
            WHEN 'streak'                 THEN v_met := v_stats.current_streak            >= v_badge.condition_value;
            WHEN 'challenge_wins'         THEN v_met := v_stats.total_challenges_won       >= v_badge.condition_value;
            WHEN 'challenge_completed'    THEN v_met := v_stats.total_challenges_completed >= v_badge.condition_value;
            WHEN 'level'                  THEN v_met := v_stats.level                      >= v_badge.condition_value;
            WHEN 'xp_total'               THEN v_met := v_stats.xp_total                   >= v_badge.condition_value;
            WHEN 'app_checkin_count'      THEN v_met := v_stats.app_total_checkins         >= v_badge.condition_value;
            WHEN 'app_streak'             THEN v_met := v_stats.app_current_streak         >= v_badge.condition_value;
            WHEN 'appointments_completed' THEN v_met := v_appointments_completed           >= v_badge.condition_value;
            WHEN 'measurements_logged'    THEN v_met := v_measurements_logged              >= v_badge.condition_value;
            ELSE v_met := FALSE;
        END CASE;

        IF v_met THEN
            INSERT INTO user_badges (user_id, tenant_id, badge_id)
            VALUES (p_user_id, p_tenant_id, v_badge.id)
            ON CONFLICT (user_id, tenant_id, badge_id) DO NOTHING;

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

-- award_app_checkin(): same body as before, but now checks/awards badges
-- on success (previously hardcoded 'new_badges': '[]'), so app-engagement
-- badges (app_checkin_count / app_streak) actually become reachable.
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
        SELECT app_current_streak INTO v_new_streak
        FROM user_game_stats
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

        RETURN jsonb_build_object(
            'success', false, 'already_checked_in', true, 'xp_earned', 0,
            'new_streak', COALESCE(v_new_streak, 0), 'new_badges', '[]'::JSONB, 'new_level', NULL
        );
END;
$$;

-- ── New badges ───────────────────────────────────────────────────────
-- All Spanish (the existing catalog is an English/Spanish mix from two
-- earlier migrations — new entries are consistently Spanish going
-- forward, without touching the existing 33). Slugs checked against the
-- full existing catalog to avoid collisions.

INSERT INTO public.badge_definitions (slug, name, description, icon, xp_reward, rarity, condition_type, condition_value, sort_order, is_active) VALUES
  -- App engagement — previously untracked by the badge system entirely
  ('app_checkin_1',        'Primer Vistazo',        'Hiciste tu primer check-in desde la app',            '📱', 25,   'common',    'app_checkin_count',      1,   100, TRUE),
  ('app_checkin_30',       'Fiel a la App',          '30 check-ins registrados desde la app',              '📲', 150,  'rare',      'app_checkin_count',      30,  101, TRUE),
  ('app_checkin_100',      'Adicto Digital',         '100 check-ins registrados desde la app',             '🤳', 400,  'epic',      'app_checkin_count',      100, 102, TRUE),
  ('app_streak_5',         'Constancia Digital',     '5 días seguidos abriendo la app',                    '🔁', 50,   'common',    'app_streak',             5,   103, TRUE),
  ('app_streak_21',        'Hábito Formado',         '21 días seguidos — así se forma un hábito',          '🧠', 400,  'epic',      'app_streak',             21,  104, TRUE),
  ('app_streak_60',        'Rutina de Hierro',       '60 días seguidos de constancia en la app',           '⚙️', 900,  'legendary', 'app_streak',             60,  105, TRUE),

  -- Appointment attendance — new dimension beyond gym check-ins
  ('appt_first',           'Primera Sesión',         'Completaste tu primera cita o clase',                '🎽', 50,   'common',    'appointments_completed', 1,   110, TRUE),
  ('appt_10',               'Cliente Frecuente',      '10 citas o clases completadas',                      '📆', 200,  'rare',      'appointments_completed', 10,  111, TRUE),
  ('appt_50',               'Comprometido',           '50 citas o clases completadas',                      '🏋️',  600,  'epic',      'appointments_completed', 50,  112, TRUE),
  ('appt_100',              'Socio de Oro',           '100 citas o clases completadas',                     '🥇', 1200, 'legendary', 'appointments_completed', 100, 113, TRUE),

  -- Progress tracking — rewards logging measurements consistently
  ('measure_first',        'Primer Registro',        'Registraste tu primera medida corporal',             '📏', 30,   'common',    'measurements_logged',    1,   120, TRUE),
  ('measure_5',             'Seguimiento Real',       '5 registros de medidas corporales',                  '📊', 120,  'rare',      'measurements_logged',    5,   121, TRUE),
  ('measure_12',            'Transformación Anual',   '12 registros — un año de seguimiento mensual',       '📈', 350,  'epic',      'measurements_logged',    12,  122, TRUE),

  -- Gym check-in / streak milestones filling gaps in the existing ladder
  ('checkin_200',           'Imparable',              '200 check-ins físicos en el gimnasio',               '🚴', 600,  'epic',      'checkin_count',          200, 130, TRUE),
  ('streak_60',             'Dos Meses de Fuego',     'Racha de 60 días consecutivos',                      '🔥', 450,  'epic',      'streak',                 60,  131, TRUE),
  ('streak_200',            'Casi un Año',            'Racha de 200 días consecutivos',                     '🏔️', 1200, 'legendary', 'streak',                 200, 132, TRUE),

  -- Level / XP milestones filling gaps
  ('level_30',              'Élite',                  'Alcanzaste el nivel 30',                             '🛡️', 900,  'epic',      'level',                  30,  140, TRUE),
  ('level_40',              'Maestro',                'Alcanzaste el nivel 40',                             '🎓', 1500, 'legendary', 'level',                  40,  141, TRUE),
  ('xp_100000',             'Titán del XP',           'Acumulaste 100,000 XP en total',                     '🪐', 0,    'legendary', 'xp_total',               100000, 142, TRUE),

  -- Special / manual — awarded by hand for milestones the system can't
  -- detect on its own (matches the existing 'legend'/'ambassador' pattern)
  ('founder',               'Fundador',               'Miembro fundador del gimnasio',                      '🏛️', 500,  'legendary', 'manual',                 NULL, 150, TRUE),
  ('comeback',               'El Regreso',             'Volviste al gimnasio después de una pausa',          '🔄', 100,  'rare',      'manual',                 NULL, 151, TRUE),
  ('birthday_fit',           'Cumpleaños Fit',         'Entrenaste en tu cumpleaños',                        '🎂', 75,   'common',    'manual',                 NULL, 152, TRUE)
ON CONFLICT (slug) DO NOTHING;
