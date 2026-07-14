-- ============================================================
-- Migration 000079: Demo clients and videos
--
-- Creates:
--   • 8 demo client users (auth.users + profiles + user_roles)
--   • 15 demo training videos (all statuses published, no actual files)
--
-- Demo password for all clients: GymDemo2024!
-- Demo emails: ana.garcia@demo.argym.io, carlos.martinez@demo.argym.io, etc.
-- ============================================================

-- pgcrypto is pre-installed in Supabase under the 'extensions' schema
-- Use fully-qualified extensions.crypt() / extensions.gen_salt()

DO $$
DECLARE
  v_tid             UUID;
  v_admin_id        UUID;
  v_client_role_id  UUID;

  -- Fixed demo client UUIDs (stable across re-runs)
  u_ana     CONSTANT UUID := 'b0000001-0000-0000-0000-000000000001';
  u_carlos  CONSTANT UUID := 'b0000002-0000-0000-0000-000000000002';
  u_maria   CONSTANT UUID := 'b0000003-0000-0000-0000-000000000003';
  u_jose    CONSTANT UUID := 'b0000004-0000-0000-0000-000000000004';
  u_laura   CONSTANT UUID := 'b0000005-0000-0000-0000-000000000005';
  u_diego   CONSTANT UUID := 'b0000006-0000-0000-0000-000000000006';
  u_sofia   CONSTANT UUID := 'b0000007-0000-0000-0000-000000000007';
  u_andres  CONSTANT UUID := 'b0000008-0000-0000-0000-000000000008';

  -- Video category IDs (global categories seeded in 000025)
  cat_general     UUID;
  cat_fuerza      UUID;
  cat_cardio      UUID;
  cat_flex        UUID;
  cat_nutricion   UUID;
  cat_motivacion  UUID;

BEGIN
  -- ── Resolve tenant + admin ──────────────────────────────────
  SELECT id INTO v_tid FROM public.tenants LIMIT 1;
  IF v_tid IS NULL THEN RAISE NOTICE 'No tenant found — skipping seed'; RETURN; END IF;

  SELECT p.id INTO v_admin_id
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.name = 'admin' AND ur.tenant_id = v_tid
  LIMIT 1;

  SELECT id INTO v_client_role_id FROM public.roles WHERE name = 'client' LIMIT 1;
  IF v_client_role_id IS NULL THEN RAISE EXCEPTION 'Role "client" not found'; END IF;

  -- ── Video categories ─────────────────────────────────────────
  SELECT id INTO cat_general    FROM public.video_categories WHERE slug = 'general'     AND tenant_id IS NULL;
  SELECT id INTO cat_fuerza     FROM public.video_categories WHERE slug = 'strength'    AND tenant_id IS NULL;
  SELECT id INTO cat_cardio     FROM public.video_categories WHERE slug = 'cardio'      AND tenant_id IS NULL;
  SELECT id INTO cat_flex       FROM public.video_categories WHERE slug = 'flexibility' AND tenant_id IS NULL;
  SELECT id INTO cat_nutricion  FROM public.video_categories WHERE slug = 'nutrition'   AND tenant_id IS NULL;
  SELECT id INTO cat_motivacion FROM public.video_categories WHERE slug = 'motivation'  AND tenant_id IS NULL;

  -- ── AUTH USERS ───────────────────────────────────────────────
  -- The trigger handle_new_user() fires on INSERT and auto-creates the profile.
  -- raw_user_meta_data must include tenant_id and full_name for the trigger.

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user
  ) VALUES

    ('00000000-0000-0000-0000-000000000000', u_ana, 'authenticated', 'authenticated',
     'ana.garcia@demo.argym.io',
     extensions.crypt('GymDemo2024!', extensions.gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('tenant_id', v_tid, 'full_name', 'Ana García Rodríguez', 'requested_role', 'client'),
     NOW() - INTERVAL '60 days', NOW(), FALSE),

    ('00000000-0000-0000-0000-000000000000', u_carlos, 'authenticated', 'authenticated',
     'carlos.martinez@demo.argym.io',
     extensions.crypt('GymDemo2024!', extensions.gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('tenant_id', v_tid, 'full_name', 'Carlos Martínez Soto', 'requested_role', 'client'),
     NOW() - INTERVAL '45 days', NOW(), FALSE),

    ('00000000-0000-0000-0000-000000000000', u_maria, 'authenticated', 'authenticated',
     'maria.rodriguez@demo.argym.io',
     extensions.crypt('GymDemo2024!', extensions.gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('tenant_id', v_tid, 'full_name', 'María Rodríguez Mora', 'requested_role', 'client'),
     NOW() - INTERVAL '30 days', NOW(), FALSE),

    ('00000000-0000-0000-0000-000000000000', u_jose, 'authenticated', 'authenticated',
     'jose.hernandez@demo.argym.io',
     extensions.crypt('GymDemo2024!', extensions.gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('tenant_id', v_tid, 'full_name', 'José Hernández Castro', 'requested_role', 'client'),
     NOW() - INTERVAL '90 days', NOW(), FALSE),

    ('00000000-0000-0000-0000-000000000000', u_laura, 'authenticated', 'authenticated',
     'laura.perez@demo.argym.io',
     extensions.crypt('GymDemo2024!', extensions.gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('tenant_id', v_tid, 'full_name', 'Laura Pérez Vargas', 'requested_role', 'client'),
     NOW() - INTERVAL '15 days', NOW(), FALSE),

    ('00000000-0000-0000-0000-000000000000', u_diego, 'authenticated', 'authenticated',
     'diego.castro@demo.argym.io',
     extensions.crypt('GymDemo2024!', extensions.gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('tenant_id', v_tid, 'full_name', 'Diego Castro Jiménez', 'requested_role', 'client'),
     NOW() - INTERVAL '7 days', NOW(), FALSE),

    ('00000000-0000-0000-0000-000000000000', u_sofia, 'authenticated', 'authenticated',
     'sofia.jimenez@demo.argym.io',
     extensions.crypt('GymDemo2024!', extensions.gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('tenant_id', v_tid, 'full_name', 'Sofía Jiménez Blanco', 'requested_role', 'client'),
     NOW() - INTERVAL '120 days', NOW(), FALSE),

    ('00000000-0000-0000-0000-000000000000', u_andres, 'authenticated', 'authenticated',
     'andres.vargas@demo.argym.io',
     extensions.crypt('GymDemo2024!', extensions.gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('tenant_id', v_tid, 'full_name', 'Andrés Vargas Solano', 'requested_role', 'client'),
     NOW() - INTERVAL '20 days', NOW(), FALSE)

  ON CONFLICT DO NOTHING;

  -- ── PROFILES ────────────────────────────────────────────────
  -- The protect_approval_fields trigger fires only on UPDATE, not INSERT.
  -- Use DELETE + INSERT to seed with correct approval values, bypassing it.
  -- (Migrations run as postgres = table owner, so ALTER TABLE is allowed.)
  ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_approval_fields;

  -- Upsert: delete auto-created rows (from handle_new_user trigger) then re-insert
  -- with all approval fields set correctly in a single INSERT (no UPDATE needed).
  DELETE FROM public.profiles
  WHERE id IN (u_ana, u_carlos, u_maria, u_jose, u_laura, u_diego, u_sofia, u_andres);

  INSERT INTO public.profiles (
    id, tenant_id, full_name, is_active, approval_status,
    approved_by, approved_at, phone, client_level
  ) VALUES
    (u_ana,    v_tid, 'Ana García Rodríguez', TRUE, 'approved', v_admin_id, NOW() - INTERVAL '55 days',  '8800-1001', 'beginner'),
    (u_carlos, v_tid, 'Carlos Martínez Soto', TRUE, 'approved', v_admin_id, NOW() - INTERVAL '40 days',  '8800-2002', 'intermediate'),
    (u_maria,  v_tid, 'María Rodríguez Mora',  TRUE, 'approved', v_admin_id, NOW() - INTERVAL '25 days',  '8800-3003', 'beginner'),
    (u_jose,   v_tid, 'José Hernández Castro', TRUE, 'approved', v_admin_id, NOW() - INTERVAL '85 days',  '8800-4004', 'advanced'),
    (u_laura,  v_tid, 'Laura Pérez Vargas',    TRUE, 'approved', v_admin_id, NOW() - INTERVAL '10 days',  '8800-5005', 'intermediate'),
    (u_diego,  v_tid, 'Diego Castro Jiménez',  TRUE, 'approved', v_admin_id, NOW() - INTERVAL '3 days',   '8800-6006', 'beginner'),
    (u_sofia,  v_tid, 'Sofía Jiménez Blanco',  TRUE, 'approved', v_admin_id, NOW() - INTERVAL '115 days', '8800-7007', 'advanced'),
    (u_andres, v_tid, 'Andrés Vargas Solano',  TRUE, 'approved', v_admin_id, NOW() - INTERVAL '15 days',  '8800-8008', 'intermediate');

  ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_approval_fields;

  -- ── CLIENT ROLE ASSIGNMENT ───────────────────────────────────
  INSERT INTO public.user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES
    (u_ana,    v_tid, v_client_role_id, v_admin_id),
    (u_carlos, v_tid, v_client_role_id, v_admin_id),
    (u_maria,  v_tid, v_client_role_id, v_admin_id),
    (u_jose,   v_tid, v_client_role_id, v_admin_id),
    (u_laura,  v_tid, v_client_role_id, v_admin_id),
    (u_diego,  v_tid, v_client_role_id, v_admin_id),
    (u_sofia,  v_tid, v_client_role_id, v_admin_id),
    (u_andres, v_tid, v_client_role_id, v_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;

  -- ── DEMO VIDEOS (15) ─────────────────────────────────────────
  -- video_storage_path and thumbnail_storage_path are nullable.
  -- thumbnail_color is used as placeholder in the UI.
  INSERT INTO public.videos (
    tenant_id, title, description, category_id, level, status,
    thumbnail_color, duration_seconds, is_free, is_featured,
    allowed_levels, created_by, views_count
  ) VALUES

  -- ═══ FUERZA — Beginner ═══
  (v_tid,
   'Sentadilla perfecta: técnica paso a paso',
   'Domina la sentadilla correcta desde cero. Aprende postura, respiración y profundidad para trabajar glúteos y cuádriceps de forma segura y efectiva.',
   cat_fuerza, 'beginner', 'published', '#C0392B',
   1245, TRUE, TRUE,
   ARRAY['beginner','intermediate','advanced']::video_level[], v_admin_id, 342),

  (v_tid,
   'Flexiones desde cero: empuje sin equipamiento',
   'Domina las flexiones en todas sus variantes, desde las rodillas hasta las estrictas. Construye fuerza de empuje sin necesidad de gimnasio.',
   cat_fuerza, 'beginner', 'published', '#E74C3C',
   980, TRUE, FALSE,
   ARRAY['beginner']::video_level[], v_admin_id, 189),

  -- ═══ FUERZA — Intermediate ═══
  (v_tid,
   'Press de banca: técnica y progresión',
   'Agarre, posición escapular, arco dorsal y trayectoria de la barra. Todo lo que necesitas para progresar de forma segura en el press de banca.',
   cat_fuerza, 'intermediate', 'published', '#922B21',
   1560, FALSE, FALSE,
   ARRAY['intermediate','advanced']::video_level[], v_admin_id, 234),

  (v_tid,
   'Peso muerto: el rey de los ejercicios compuestos',
   'El peso muerto activa más de 300 músculos simultáneamente. Aprende las variantes convencional, sumo y rumana y cuándo usar cada una.',
   cat_fuerza, 'intermediate', 'published', '#7B241C',
   1820, FALSE, TRUE,
   ARRAY['intermediate','advanced']::video_level[], v_admin_id, 512),

  -- ═══ FUERZA — Advanced ═══
  (v_tid,
   'Powerlifting: los tres grandes movimientos',
   'Sentadilla de alta bar, press de banca con pausa y peso muerto convencional. Entrenamiento de alta intensidad para atletas experimentados.',
   cat_fuerza, 'advanced', 'published', '#4A235A',
   2400, FALSE, FALSE,
   ARRAY['advanced']::video_level[], v_admin_id, 98),

  -- ═══ CARDIO — Beginner ═══
  (v_tid,
   'Cardio sin impacto: 20 minutos para principiantes',
   'Rutina de bajo impacto diseñada para quienes empiezan o tienen problemas articulares. Sin saltos, sin impacto, máxima activación cardiovascular.',
   cat_cardio, 'beginner', 'published', '#2E86C1',
   1200, TRUE, FALSE,
   ARRAY['beginner','intermediate']::video_level[], v_admin_id, 445),

  (v_tid,
   'Caminata activa: cardio en tu día a día',
   'Las técnicas de caminata activa para maximizar el gasto calórico. Pasos, postura, ritmo y variantes para mantener la intensidad.',
   cat_cardio, 'beginner', 'published', '#1A5276',
   900, TRUE, FALSE,
   ARRAY['beginner']::video_level[], v_admin_id, 267),

  -- ═══ CARDIO — Intermediate ═══
  (v_tid,
   'HIIT 30 minutos: quema máxima de grasa',
   'Intervalos de alta intensidad diseñados para maximizar el EPOC (quema de calorías post-ejercicio). Combina sprints, saltos y trabajo de core.',
   cat_cardio, 'intermediate', 'published', '#1F618D',
   1800, FALSE, TRUE,
   ARRAY['intermediate','advanced']::video_level[], v_admin_id, 731),

  -- ═══ CARDIO — Advanced ═══
  (v_tid,
   'Tabata extremo: protocolo de 4 minutos',
   '20 segundos de esfuerzo máximo, 10 segundos de descanso, 8 rondas. El protocolo Tabata original para atletas con base cardiovascular sólida.',
   cat_cardio, 'advanced', 'published', '#154360',
   1440, FALSE, FALSE,
   ARRAY['advanced']::video_level[], v_admin_id, 156),

  -- ═══ FLEXIBILIDAD — Beginner ═══
  (v_tid,
   'Estiramientos matutinos: 10 minutos para despertar',
   'Rutina completa de estiramientos dinámicos y estáticos para iniciar el día con el cuerpo activado, la mente clara y las tensiones disueltas.',
   cat_flex, 'beginner', 'published', '#1E8449',
   600, TRUE, FALSE,
   ARRAY['beginner','intermediate','advanced']::video_level[], v_admin_id, 388),

  -- ═══ FLEXIBILIDAD — Intermediate ═══
  (v_tid,
   'Yoga funcional para deportistas',
   'Posiciones de yoga aplicadas al rendimiento deportivo. Trabaja cadena posterior, hombros y cadera para reducir lesiones y mejorar la recuperación.',
   cat_flex, 'intermediate', 'published', '#196F3D',
   2100, FALSE, FALSE,
   ARRAY['intermediate','advanced']::video_level[], v_admin_id, 211),

  -- ═══ FLEXIBILIDAD — Advanced ═══
  (v_tid,
   'Movilidad avanzada: cadera y hombros',
   'Protocolo de movilidad articular para atletas avanzados. CARs (Controlled Articular Rotations), PAILS y RAILS para maximizar el rango funcional.',
   cat_flex, 'advanced', 'published', '#145A32',
   1680, FALSE, FALSE,
   ARRAY['advanced']::video_level[], v_admin_id, 89),

  -- ═══ NUTRICIÓN ═══
  (v_tid,
   'Cómo calcular tus macros correctamente',
   'Paso a paso: cálculo de TDEE, distribución de macronutrientes según tu objetivo (déficit, mantenimiento o superávit) y cómo ajustar según resultados.',
   cat_nutricion, 'beginner', 'published', '#7D6608',
   1320, TRUE, FALSE,
   ARRAY['beginner','intermediate','advanced']::video_level[], v_admin_id, 623),

  -- ═══ MOTIVACIÓN ═══
  (v_tid,
   'Mentalidad de campeón: la psicología del rendimiento',
   'Los atletas de élite comparten patrones mentales específicos. Aprende visualización, diálogo interno, gestión del fracaso y rutinas de alto rendimiento.',
   cat_motivacion, 'beginner', 'published', '#6C3483',
   960, TRUE, FALSE,
   ARRAY['beginner','intermediate','advanced']::video_level[], v_admin_id, 895),

  (v_tid,
   'Consistencia sobre intensidad: el método que funciona',
   'Por qué la constancia supera a la motivación. Estrategias basadas en psicología del comportamiento para construir hábitos de ejercicio que duran.',
   cat_motivacion, 'beginner', 'published', '#5B2C6F',
   720, TRUE, TRUE,
   ARRAY['beginner','intermediate','advanced']::video_level[], v_admin_id, 1204)

  ON CONFLICT DO NOTHING;

  -- ── ASSIGN SOME CONTENT TO DEMO CLIENTS ─────────────────────
  -- Assign the first 3 nutrition plans from seed 000077 to clients
  -- (only if those plans exist)
  INSERT INTO public.nutrition_assignments (tenant_id, client_id, nutrition_plan_id, assigned_by, note)
  SELECT
    v_tid,
    unnested.client_id,
    np.id,
    v_admin_id,
    'Plan asignado automáticamente al registro'
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
    FROM public.nutrition_plans
    WHERE tenant_id = v_tid AND status = 'published'
    LIMIT 6
  ) np
  CROSS JOIN (
    VALUES
      (u_ana,    1), (u_ana,    2),
      (u_carlos, 2), (u_carlos, 3),
      (u_maria,  1),
      (u_jose,   4), (u_jose,   5),
      (u_laura,  3), (u_laura,  6),
      (u_sofia,  4), (u_sofia,  5)
  ) AS unnested(client_id, plan_rn)
  WHERE np.rn = unnested.plan_rn
  ON CONFLICT DO NOTHING;

END $$;
