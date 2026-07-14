-- ============================================================
-- Migration 000077: Professional seed content
--
-- Creates for the first tenant:
--   - 15 nutrition plans (5 per level)
--   - 30 routines (10 per level)
--   - 17 subscription plans
--   -  7 promotions
-- ============================================================

DO $$
DECLARE
  v_tid  UUID;   -- tenant_id
  v_uid  UUID;   -- admin user id

  -- Routine IDs (needed to reference when inserting exercises)
  -- BEGINNER
  rb01 UUID := gen_random_uuid();
  rb02 UUID := gen_random_uuid();
  rb03 UUID := gen_random_uuid();
  rb04 UUID := gen_random_uuid();
  rb05 UUID := gen_random_uuid();
  rb06 UUID := gen_random_uuid();
  rb07 UUID := gen_random_uuid();
  rb08 UUID := gen_random_uuid();
  rb09 UUID := gen_random_uuid();
  rb10 UUID := gen_random_uuid();
  -- INTERMEDIATE
  ri01 UUID := gen_random_uuid();
  ri02 UUID := gen_random_uuid();
  ri03 UUID := gen_random_uuid();
  ri04 UUID := gen_random_uuid();
  ri05 UUID := gen_random_uuid();
  ri06 UUID := gen_random_uuid();
  ri07 UUID := gen_random_uuid();
  ri08 UUID := gen_random_uuid();
  ri09 UUID := gen_random_uuid();
  ri10 UUID := gen_random_uuid();
  -- ADVANCED
  ra01 UUID := gen_random_uuid();
  ra02 UUID := gen_random_uuid();
  ra03 UUID := gen_random_uuid();
  ra04 UUID := gen_random_uuid();
  ra05 UUID := gen_random_uuid();
  ra06 UUID := gen_random_uuid();
  ra07 UUID := gen_random_uuid();
  ra08 UUID := gen_random_uuid();
  ra09 UUID := gen_random_uuid();
  ra10 UUID := gen_random_uuid();

BEGIN
  SELECT id INTO v_tid FROM public.tenants LIMIT 1;
  IF v_tid IS NULL THEN RAISE NOTICE 'No tenant found — skipping seed content'; RETURN; END IF;

  SELECT p.id INTO v_uid
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.name = 'admin' AND ur.tenant_id = v_tid
  LIMIT 1;

  -- ══════════════════════════════════════════════════════════════
  -- NUTRITION PLANS
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO public.nutrition_plans
    (tenant_id, name, description, calories_target, protein_g, carbs_g, fat_g, goal, status, is_template, created_by)
  VALUES
  -- ── BEGINNER (5) ──────────────────────────────────────────────
  (v_tid,
   'Inicio Saludable',
   'Plan de entrada ideal para quien comienza a cuidar su alimentación. Déficit calórico moderado con macros balanceados para perder grasa sin perder energía ni masa muscular. Fácil de seguir, enfocado en alimentos reales y preparación simple.',
   1800, 120, 210, 55,
   'Pérdida de grasa gradual y adopción de hábitos alimenticios sostenibles',
   'published', true, v_uid),

  (v_tid,
   'Mantenimiento Activo Básico',
   'Diseñado para mantener el peso corporal mientras se aumenta la actividad física. Calorías de mantenimiento con distribución de macros que soporta el rendimiento en entrenamientos de baja a media intensidad. Ideal para quien ya está en su peso ideal.',
   2100, 145, 240, 60,
   'Mantenimiento del peso con mejora de composición corporal',
   'published', true, v_uid),

  (v_tid,
   'Primer Paso Vegetal',
   'Plan plant-based para principiantes que desean incorporar más alimentos de origen vegetal. Proteínas provenientes de leguminosas, tofu, tempeh y lácteos. Ricamente variado en micronutrientes, hierro, calcio y B12 monitoreados.',
   1900, 105, 235, 58,
   'Transición hacia alimentación plant-based con adecuado aporte proteico',
   'published', true, v_uid),

  (v_tid,
   'Déficit Saludable Inicial',
   'Plan hipocalórico controlado para pérdida de grasa sin sacrificar músculo. Alto en proteína relativa para preservar masa magra. Distribuido en 4-5 comidas al día para controlar el hambre. Incluye espacio para una comida libre semanal.',
   1600, 135, 170, 43,
   'Pérdida de grasa corporal preservando la masa muscular existente',
   'published', true, v_uid),

  (v_tid,
   'Base Muscular Novato',
   'Superávit calórico limpio orientado a principiantes que buscan ganar masa muscular. Mayor aporte de carbohidratos para dar energía en los entrenamientos y glucógeno muscular. Proteína distribuida en cada comida para maximizar síntesis proteica.',
   2300, 165, 265, 65,
   'Ganancia de masa muscular magra para personas que inician el entrenamiento',
   'published', true, v_uid),

  -- ── INTERMEDIATE (5) ──────────────────────────────────────────
  (v_tid,
   'Definición Progresiva',
   'Plan para intermedio que desea recortar grasa manteniendo la masa muscular ganada. Alto contenido proteico para preservar músculo en déficit. Carbohidratos ciclados: más en días de entrenamiento, menos en días de descanso. Ayuda a lograr el cuerpo tonificado.',
   2050, 175, 195, 58,
   'Reducción de grasa corporal preservando y mejorando la masa muscular',
   'published', true, v_uid),

  (v_tid,
   'Hipertrofia Progresiva',
   'Plan anabólico diseñado para intermedio que busca ganar masa muscular de forma eficiente. Superávit calórico moderado (300-400 kcal sobre mantenimiento) para minimizar ganancia de grasa. Timing de nutrientes optimizado: carbohidratos pre y post entrenamiento.',
   2700, 195, 305, 78,
   'Maximizar la hipertrofia muscular con mínima ganancia de grasa',
   'published', true, v_uid),

  (v_tid,
   'Rendimiento Deportivo',
   'Plan enfocado en atletas intermedios que buscan mejorar su rendimiento. Carbohidratos como fuente principal de energía para entrenamientos intensos. Proteína para recuperación y reparación muscular. Periodización nutricional básica según intensidad del día.',
   2450, 168, 290, 66,
   'Optimizar el rendimiento atlético y la recuperación post-ejercicio',
   'published', true, v_uid),

  (v_tid,
   'Pérdida de Grasa Fase II',
   'Para intermedios que ya completaron una fase básica y buscan mayor definición. Déficit calórico más agresivo pero sostenible, con muy alto aporte proteico para preservar músculo. Estrategia de refeed semanal para mantener la tiroides y leptina activas.',
   1950, 195, 180, 50,
   'Pérdida de grasa avanzada con preservación máxima del tejido muscular',
   'published', true, v_uid),

  (v_tid,
   'Mediterráneo Activo',
   'Basado en la dieta mediterránea, una de las más estudiadas y saludables del mundo. Aceite de oliva, pescado azul, frutos secos, leguminosas y vegetales como pilares. Antiinflamatorio, cardioprotector y sostenible a largo plazo para deportistas.',
   2200, 152, 255, 73,
   'Salud cardiovascular y composición corporal óptima con alimentación mediterránea',
   'published', true, v_uid),

  -- ── ADVANCED (5) ──────────────────────────────────────────────
  (v_tid,
   'Elite Performance',
   'Plan de alto rendimiento para atletas avanzados con alta demanda calórica. Carbohidratos de alto índice glucémico post-entrenamiento para máxima recuperación del glucógeno. Periodización nutricional completa: días de carga, descarga y mantenimiento. Suplementación básica contemplada.',
   3200, 225, 385, 88,
   'Maximizar el rendimiento atlético de elite y la recuperación entre sesiones',
   'published', true, v_uid),

  (v_tid,
   'Volumen Máximo (Bulk Limpio)',
   'Plan de volumen para avanzados que buscan el máximo crecimiento muscular. Superávit calórico calculado para minimizar acumulación de grasa. Proteína distribuida en 5-6 tomas. Carbohidratos de alta calidad priorizados. Incluye estrategia de mini-cuts cada 8 semanas.',
   3800, 245, 465, 102,
   'Ganancia de masa muscular máxima con composición corporal controlada',
   'published', true, v_uid),

  (v_tid,
   'Corte Competitivo',
   'Plan de preparación para competencia o máxima definición. Déficit calórico elevado con proteína muy alta para máxima preservación muscular. Carbohidratos mínimos estratégicos, principalmente periworkout. Incluye protocolo de carga de carbohidratos previo a evento o foto.',
   2000, 230, 155, 50,
   'Definición máxima para competencia manteniendo masa muscular hard-earned',
   'published', true, v_uid),

  (v_tid,
   'Keto Atlético Avanzado',
   'Dieta cetogénica adaptada para atletas avanzados. Período de adaptación de 4-6 semanas incluido. Alta en grasas saludables (aguacate, nueces, aceite MCT), moderada en proteína, mínima en carbohidratos. Ideal para atletas de fuerza y resistencia que buscan oxidar grasa.',
   2400, 200, 50, 172,
   'Adaptar el metabolismo a oxidación de grasas manteniendo rendimiento atlético',
   'published', true, v_uid),

  (v_tid,
   'Periodización Nutricional Avanzada',
   'Plan de ciclado calórico y de carbohidratos para avanzados. Días de entrenamiento pesado: alta carga de carbohidratos y calorías. Días de entrenamiento ligero: moderados. Días de descanso: bajo en carbohidratos. Optimiza la sensibilidad a la insulina y la composición corporal.',
   2800, 205, 315, 82,
   'Optimizar composición corporal y rendimiento mediante ciclado calórico estratégico',
   'published', true, v_uid);

  -- ══════════════════════════════════════════════════════════════
  -- ROUTINES
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO public.routines (id, tenant_id, name, description, level, is_active, is_template, created_by)
  VALUES
  -- ── BEGINNER (10) ─────────────────────────────────────────────
  (rb01, v_tid, 'Full Body Iniciación',
   'Rutina de cuerpo completo para quien comienza. Movimientos básicos funcionales con peso corporal y cargas ligeras. Trabaja todos los grupos musculares principales en una sesión. Perfecta para 3 días a la semana.',
   'beginner', true, true, v_uid),

  (rb02, v_tid, 'Cardio Suave + Core',
   'Sesión cardiovascular de bajo impacto combinada con trabajo de núcleo. Ideal para los días entre sesiones de fuerza o para mejorar la base cardiovascular sin sobrecargar el sistema muscular. Reduce grasa y mejora estabilidad.',
   'beginner', true, true, v_uid),

  (rb03, v_tid, 'Movilidad y Flexibilidad Total',
   'Rutina de movilidad articular y flexibilidad muscular para mejorar el rango de movimiento y prevenir lesiones. Fundamental como preparación para entrenamientos más intensos. Puede usarse como calentamiento o sesión independiente.',
   'beginner', true, true, v_uid),

  (rb04, v_tid, 'Tren Superior Básico',
   'Entrenamiento enfocado en pecho, espalda, hombros y brazos con cargas accesibles. Movimientos compuestos y de aislamiento para desarrollar la fuerza y definición de la parte superior del cuerpo. Ideal para días alternos con tren inferior.',
   'beginner', true, true, v_uid),

  (rb05, v_tid, 'Tren Inferior Básico',
   'Trabajo de piernas, glúteos y pantorrillas con movimientos seguros y efectivos para principiantes. Enfoque en la técnica correcta de sentadilla, peso muerto y zancada para construir una base sólida de fuerza funcional.',
   'beginner', true, true, v_uid),

  (rb06, v_tid, 'Circuito HIIT Adaptado',
   'Entrenamiento en circuito de alta intensidad adaptado para principiantes. Movimientos de bajo impacto que elevan la frecuencia cardíaca y queman calorías de manera efectiva. Mejora la capacidad cardiovascular y el metabolismo sin riesgo de lesión.',
   'beginner', true, true, v_uid),

  (rb07, v_tid, 'Yoga Funcional para Deportistas',
   'Combinación de posturas de yoga adaptadas al rendimiento deportivo. Trabaja flexibilidad, equilibrio, fuerza isométrica y control respiratorio. Reduce el estrés, mejora la postura y acelera la recuperación muscular.',
   'beginner', true, true, v_uid),

  (rb08, v_tid, 'Glúteos y Piernas para Principiante',
   'Rutina especializada en el desarrollo de glúteos y musculatura posterior de pierna. Alta activación de glúteo mayor, medio y menor con ejercicios de aislamiento y compuestos. Combina peso corporal con bandas elásticas de resistencia.',
   'beginner', true, true, v_uid),

  (rb09, v_tid, 'Pecho y Espalda Básico',
   'Entrenamiento de empuje y jalón para principiantes. Desarrollo equilibrado de pectorales y músculos de la espalda. Fortalece los estabilizadores del hombro y mejora la postura. Movimientos progresivos desde el nivel más básico.',
   'beginner', true, true, v_uid),

  (rb10, v_tid, 'Resistencia Cardiovascular Base',
   'Sesión de resistencia aeróbica para construir la base cardiovascular. Combina diferentes equipos cardiovasculares en intervalos moderados. Ideal para principiantes que buscan mejorar su capacidad respiratoria y quemar grasa de forma constante.',
   'beginner', true, true, v_uid),

  -- ── INTERMEDIATE (10) ─────────────────────────────────────────
  (ri01, v_tid, 'Push-Pull-Legs A (Empuje)',
   'Primera sesión del sistema Push-Pull-Legs. Trabajamos empuje: pecho, hombros y tríceps con progresión de cargas. Movimientos compuestos como press banca, press militar y press inclinado como base, con aislamiento final.',
   'intermediate', true, true, v_uid),

  (ri02, v_tid, 'Push-Pull-Legs B (Jalón)',
   'Segunda sesión del sistema PPL. Trabajo de jalón: espalda y bíceps. Dominadas asistidas o con banda, remo en máquina, jalón al pecho y curl de bíceps con variantes. Enfoque en mente-músculo y congestión.',
   'intermediate', true, true, v_uid),

  (ri03, v_tid, 'Push-Pull-Legs C (Piernas)',
   'Sesión de piernas del sistema PPL. Sentadilla como movimiento rey, complementado con prensa, extensiones, curl femoral y trabajo de glúteos. Alta intensidad y volumen para máximo estímulo de crecimiento en tren inferior.',
   'intermediate', true, true, v_uid),

  (ri04, v_tid, 'HIIT Metabólico Avanzado',
   'Entrenamiento de intervalos de alta intensidad con movimientos compuestos y funcionales. Quema calórica elevada durante y después del entrenamiento (efecto EPOC). Mejora la resistencia cardiovascular, la potencia y el metabolismo en reposo.',
   'intermediate', true, true, v_uid),

  (ri05, v_tid, 'Fuerza Funcional Completa',
   'Entrenamiento de fuerza basado en patrones de movimiento funcionales: empuje, jalón, sentadilla, bisagra de cadera y rotación. Mejora la transferencia de la fuerza del gimnasio a la vida real y deportes. Ideal para atletas recreacionales.',
   'intermediate', true, true, v_uid),

  (ri06, v_tid, 'Core y Estabilización Avanzada',
   'Trabajo profundo de core que va más allá del abdomen superficial. Activa transverso abdominal, multífidos, oblicuos y suelo pélvico. Incluye anti-rotación, anti-extensión y anti-flexión lateral para un core funcional y protector de la columna.',
   'intermediate', true, true, v_uid),

  (ri07, v_tid, 'Glúteos y Posterior de Muslo',
   'Rutina especializada para el desarrollo máximo de glúteos, isquiotibiales y aductores. Hip thrust con barra, peso muerto rumano, curl femoral y variantes de puente. Protocolo de activación previa incluido para máxima conexión mente-músculo.',
   'intermediate', true, true, v_uid),

  (ri08, v_tid, 'Hombros y Brazos Detallado',
   'Sesión de día pequeño enfocada en el desarrollo estético de hombros, bíceps y tríceps. Trabaja los 3 haces del deltoides por separado. Progresión de curl bíceps y extensiones de tríceps con variantes de agarre y ángulo.',
   'intermediate', true, true, v_uid),

  (ri09, v_tid, 'Pecho Fuerza y Volumen',
   'Entrenamiento de pecho con enfoque dual: fuerza en movimientos pesados y volumen en ejercicios de aislamiento. Periodización ondulante dentro de la sesión. Incluye press plano, inclinado, declinado y apertura para desarrollo completo del pectoral.',
   'intermediate', true, true, v_uid),

  (ri10, v_tid, 'Total Body Intensivo Intermedio',
   'Rutina de cuerpo completo de alta intensidad para intermedios. Mayor densidad de trabajo que el nivel principiante. Supersets y trisets para maximizar el tiempo de entrenamiento. Quema calórica elevada con estímulo muscular completo.',
   'intermediate', true, true, v_uid),

  -- ── ADVANCED (10) ─────────────────────────────────────────────
  (ra01, v_tid, 'Arnold Split Día A (Pecho-Espalda)',
   'Primera sesión del clásico Arnold Split popularizado por Arnold Schwarzenegger. Entrenamiento combinado de pecho y espalda en supersets antagonistas. Método científicamente respaldado: mientras uno descansa el otro trabaja. Alto volumen e intensidad.',
   'advanced', true, true, v_uid),

  (ra02, v_tid, 'Arnold Split Día B (Hombros-Brazos)',
   'Segunda sesión del Arnold Split. Trabajo completo de hombros: press, elevaciones laterales, posteriores y remo al mentón. Seguido de trabajo intensivo de bíceps y tríceps en supersets. Sesión larga y completa para máximo desarrollo estético.',
   'advanced', true, true, v_uid),

  (ra03, v_tid, 'Arnold Split Día C (Piernas-Abdomen)',
   'Tercera sesión del Arnold Split. Sentadilla pesada, prensa, extensiones, curl femoral, peso muerto. Finaliza con trabajo abdominal exhaustivo. El día más exigente del split, requiere máxima concentración y preparación.',
   'advanced', true, true, v_uid),

  (ra04, v_tid, 'Powerlifting Base',
   'Entrenamiento centrado en los 3 levantamientos de powerlifting: sentadilla, press banca y peso muerto. Protocolo de intensidad alta (85-95% 1RM). Descansos largos para máxima recuperación entre series. Mejora la fuerza máxima y la eficiencia neuromuscular.',
   'advanced', true, true, v_uid),

  (ra05, v_tid, 'Atlético Explosivo',
   'Entrenamiento pliométrico y de potencia para atletas avanzados. Saltos, sprints, medicine ball throws y levantamientos olímpicos modificados. Desarrolla la potencia explosiva, velocidad de reacción y coordinación neuromuscular. Mejora rendimiento deportivo.',
   'advanced', true, true, v_uid),

  (ra06, v_tid, 'Hipertrofia Bloque Superior',
   'Sesión de hipertrofia de tren superior con volumen elevado y múltiples técnicas de intensidad: rest-pause, myo-reps, cluster sets y drop sets. Pecho, espalda, hombros y brazos con mínimo 20 series efectivas totales. Para músculo máximo.',
   'advanced', true, true, v_uid),

  (ra07, v_tid, 'Hipertrofia Bloque Inferior',
   'Sesión de hipertrofia de tren inferior con protocolo de alto volumen. Sentadilla frontal y trasera, prensa con diferentes ángulos, hack squat, curl femoral unilateral, extensiones y trabajo de gemelos. 24+ series efectivas en piernas.',
   'advanced', true, true, v_uid),

  (ra08, v_tid, 'CrossFit WOD Adaptado Avanzado',
   'Workout of the Day inspirado en CrossFit pero adaptado para gym convencional. Combina halterofilia, gimnasia y cardio en un metcon de alta intensidad. Desarrolla la capacidad de trabajo, resistencia muscular local y cardiovascular simultáneamente.',
   'advanced', true, true, v_uid),

  (ra09, v_tid, 'Torso Completo Elite',
   'Sesión completa de torso para atletas avanzados. Movimientos compuestos pesados combinados con trabajo de aislamiento específico. Press de banca con bandas, peso muerto sumo, dominadas lastradas, press militar estricto y trabajo correctivo.',
   'advanced', true, true, v_uid),

  (ra10, v_tid, 'Periodización Ondulante Piernas',
   'Entrenamiento de piernas con periodización ondulante diaria (DUP). Alterna entre rangos de fuerza (3-5 reps), hipertrofia (8-12 reps) y resistencia (15-20 reps) en la misma sesión. Estímulo variado que maximiza adaptaciones musculares y neurales.',
   'advanced', true, true, v_uid);

  -- ══════════════════════════════════════════════════════════════
  -- EXERCISES (5-6 por rutina)
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO public.exercises
    (routine_id, tenant_id, name, muscle, sets, reps, rest_seconds, notes, sort_order)
  VALUES
  -- rb01: Full Body Iniciación
  (rb01,v_tid,'Sentadilla con peso corporal','Piernas',3,15,60,'Pies al ancho de hombros, rodillas hacia afuera, baja hasta paralelo',1),
  (rb01,v_tid,'Flexiones en rodillas','Pecho',3,10,60,'Cuerpo recto desde rodillas a hombros, baja hasta 1 cm del suelo',2),
  (rb01,v_tid,'Remo con banda elástica','Espalda',3,12,60,'Codos pegados al cuerpo, retrae escápulas al final del movimiento',3),
  (rb01,v_tid,'Puente de glúteos','Glúteos',3,15,45,'Aprieta glúteos en la cima, mantén 1 segundo antes de bajar',4),
  (rb01,v_tid,'Plancha abdominal','Core',3,20,45,'Cuerpo recto, activa abdomen y glúteos, no dejes caer la cadera',5),
  (rb01,v_tid,'Marcha en el lugar','Cardio',3,30,30,'Rodillas a la altura de la cadera, brazos en movimiento activo',6),

  -- rb02: Cardio Suave + Core
  (rb02,v_tid,'Caminata lateral con banda','Piernas',3,12,45,'Banda sobre rodillas, pasos laterales controlados, no juntes pies',1),
  (rb02,v_tid,'Crunch abdominal básico','Core',3,15,45,'Nunca jalones el cuello, exhala al subir, inhala al bajar',2),
  (rb02,v_tid,'Elevación de piernas en suelo','Core',3,10,45,'Espalda baja pegada al suelo durante todo el movimiento',3),
  (rb02,v_tid,'Superman','Espalda',3,12,45,'Levanta brazos y piernas simultáneamente, mantén 2 seg en cima',4),
  (rb02,v_tid,'Bicicleta abdominal','Core',3,20,30,'Movimiento lento y controlado, codo al lado contrario de la rodilla',5),
  (rb02,v_tid,'Plancha lateral','Core',2,15,30,'Cadera elevada en línea recta, no dejes caer la pelvis',6),

  -- rb03: Movilidad y Flexibilidad Total
  (rb03,v_tid,'Gato-Camello','Espalda',3,10,20,'Sincroniza movimiento con respiración, máximo rango en cada posición',1),
  (rb03,v_tid,'Apertura de cadera (paloma)','Glúteos',3,30,20,'Mantén posición 30 segundos cada lado, respira profundo',2),
  (rb03,v_tid,'World Greatest Stretch','General',3,5,20,'5 repeticiones cada lado, movimiento fluido entre posiciones',3),
  (rb03,v_tid,'Rotación torácica en cuadrupedia','Espalda',3,10,20,'Sigue el movimiento con los ojos, rota desde la caja torácica',4),
  (rb03,v_tid,'Estiramiento isquiotibiales','Piernas',3,30,20,'Pierna extendida, inclínate desde cadera sin doblar la espalda',5),
  (rb03,v_tid,'Apertura de hombros con banda','Hombros',3,10,20,'Agarre ancho, pasa la banda por encima de la cabeza sin doblar codos',6),

  -- rb04: Tren Superior Básico
  (rb04,v_tid,'Flexiones en pared','Pecho',3,12,60,'Inclinación moderada, cuerpo recto, progresión hacia el suelo',1),
  (rb04,v_tid,'Remo con mancuerna a 1 brazo','Espalda',3,12,60,'Apoya rodilla y mano en banco, codo sube paralelo al cuerpo',2),
  (rb04,v_tid,'Press de hombros con mancuernas','Hombros',3,10,75,'Sentado, empuja hasta extensión casi completa, baja controlado',3),
  (rb04,v_tid,'Curl de bíceps alternado','Bíceps',3,12,60,'Supina la muñeca al subir, baja lentamente hasta extensión completa',4),
  (rb04,v_tid,'Extensión de tríceps en polea','Tríceps',3,12,60,'Codos fijos a los lados, extiende completamente en cada repetición',5),
  (rb04,v_tid,'Face pull con banda','Hombros',3,15,45,'Codos altos, jala hacia la cara, rotación externa al final',6),

  -- rb05: Tren Inferior Básico
  (rb05,v_tid,'Sentadilla goblet con mancuerna','Piernas',3,15,60,'Mancuerna al pecho, espalda neutral, profundidad completa',1),
  (rb05,v_tid,'Zancada estacionaria','Piernas',3,10,60,'10 repeticiones cada pierna, rodilla trasera cerca del suelo',2),
  (rb05,v_tid,'Peso muerto rumano','Piernas',3,12,75,'Bisagra de cadera, espalda recta, siente el jalón en isquiotibiales',3),
  (rb05,v_tid,'Hip thrust con peso corporal','Glúteos',4,15,45,'Hombros en banco, aprieta glúteos fuerte en la cima',4),
  (rb05,v_tid,'Elevación de pantorrillas de pie','Piernas',3,20,30,'Máxima amplitud, mantén 1 seg en cima y 2 seg en descenso',5),
  (rb05,v_tid,'Abducción de cadera con banda','Glúteos',3,15,45,'Banda sobre rodillas, abre controlado, siente el glúteo medio',6),

  -- rb06: Circuito HIIT Adaptado
  (rb06,v_tid,'Jumping Jacks bajo impacto','Cardio',3,30,30,'Paso lateral en lugar de salto, mantén ritmo constante',1),
  (rb06,v_tid,'Squat con paso lateral','Piernas',3,20,30,'Baja en sentadilla, da un paso lateral, repite al otro lado',2),
  (rb06,v_tid,'Mountain Climbers lentos','Core',3,20,45,'Alterna rodillas al pecho, mantén cadera estable, sin rebotar',3),
  (rb06,v_tid,'Burpee sin salto','General',3,6,60,'Parado, manos al suelo, estira piernas, flexión, vuelve y levanta',4),
  (rb06,v_tid,'Step lateral rápido','Cardio',3,30,30,'Paso rápido de lado a lado, brazos activos, rodillas levemente flexionadas',5),
  (rb06,v_tid,'Sentadilla + Press de mancuernas','General',3,12,45,'Combo compuesto: sentadilla al bajar, press al subir',6),

  -- rb07: Yoga Funcional para Deportistas
  (rb07,v_tid,'Saludo al Sol (Surya Namaskar)','General',3,1,30,'Una repetición completa = secuencia entera de 12 posiciones',1),
  (rb07,v_tid,'Guerrero I','General',3,30,20,'30 segundos cada lado, cadera cuadrada al frente, brazo extendido',2),
  (rb07,v_tid,'Guerrero II','General',3,30,20,'Cadera abierta, rodilla sobre tobillo, mirada hacia adelante',3),
  (rb07,v_tid,'Tabla (Plank) yoga','Core',3,30,20,'Activación completa del core, no dejes caer la cadera',4),
  (rb07,v_tid,'Postura del niño extendido','Espalda',3,45,20,'Brazos extendidos, frente al suelo, respira hacia la espalda',5),
  (rb07,v_tid,'Torsión supina','Espalda',3,30,20,'30 segundos cada lado, hombros pegados al suelo',6),

  -- rb08: Glúteos y Piernas Principiante
  (rb08,v_tid,'Hip Thrust con peso corporal','Glúteos',4,20,45,'Hombros en superficie elevada, aprieta glúteo en cima',1),
  (rb08,v_tid,'Sentadilla sumo','Piernas',3,15,60,'Pies más abiertos que hombros, puntas afuera 45°, rodillas afuera',2),
  (rb08,v_tid,'Puente glúteo lateral (clamshell)','Glúteos',3,15,45,'15 repeticiones cada lado, banda sobre rodillas para mayor activación',3),
  (rb08,v_tid,'Patada de glúteo en cuadrupedia','Glúteos',3,15,45,'15 cada lado, rodilla a 90°, empuja el talón al techo',4),
  (rb08,v_tid,'Paso de pato con banda','Glúteos',3,10,45,'10 metros de ida y vuelta, rodillas dobladas, banda tensionada',5),
  (rb08,v_tid,'Elevación de talones de pie','Piernas',3,20,30,'Lento y controlado, máxima amplitud de movimiento',6),

  -- rb09: Pecho y Espalda Básico
  (rb09,v_tid,'Flexiones en rodillas','Pecho',3,12,75,'Progresa semanalmente: cuando hagas 15, pasa a flexiones completas',1),
  (rb09,v_tid,'Flexiones inclinadas en banco','Pecho',3,10,75,'Manos en banco, cuerpo en ángulo de 45°, controla el descenso',2),
  (rb09,v_tid,'Remo con banda a dos manos','Espalda',3,15,60,'Retrae escápulas antes de empezar cada repetición',3),
  (rb09,v_tid,'Pull-over con mancuerna','Espalda',3,12,60,'Tumbado en banco, arco de movimiento completo sobre la cabeza',4),
  (rb09,v_tid,'Aperturas pec-deck con banda','Pecho',3,15,45,'Simula máquina pec-deck con banda en columna, codos levemente flexionados',5),
  (rb09,v_tid,'Retracción escapular','Espalda',3,15,30,'Pellizca los omóplatos, mantén 2 segundos, fundamental para postura',6),

  -- rb10: Resistencia Cardiovascular Base
  (rb10,v_tid,'Caminata intensa en cinta','Cardio',1,5,60,'5 minutos a 6 km/h con 3% de inclinación como calentamiento',1),
  (rb10,v_tid,'Bicicleta estática resistencia moderada','Cardio',3,3,90,'3 minutos por intervalo, resistencia 6-7/10, cadencia constante',2),
  (rb10,v_tid,'Remo estático moderado','Cardio',3,2,90,'2 minutos por serie, 22 paladas/minuto, postura correcta siempre',3),
  (rb10,v_tid,'Step o Stepper','Cardio',3,2,60,'2 minutos por serie, presiona el talón completo en cada paso',4),
  (rb10,v_tid,'Caminata inclinada final','Cardio',1,5,60,'5 minutos a 5.5 km/h con 6-8% inclinación, enfriamiento activo',5),
  (rb10,v_tid,'Estiramiento general post-cardio','General',1,5,0,'5 minutos de estiramiento estático completo de cuerpo',6),

  -- ri01: Push-Pull-Legs A (Empuje)
  (ri01,v_tid,'Press de Banca con Barra','Pecho',4,8,180,'4x8 al 75-80% 1RM, baja 3 segundos, explota hacia arriba',1),
  (ri01,v_tid,'Press Inclinado con Mancuernas','Pecho',3,10,120,'Ángulo 30-45°, codos a 75° del cuerpo, rango completo',2),
  (ri01,v_tid,'Press Militar con Barra','Hombros',3,10,120,'De pie o sentado, barra baja hasta nariz, empuja completamente',3),
  (ri01,v_tid,'Elevaciones Laterales','Hombros',4,12,60,'Codos levemente flexionados, sube hasta 90°, baja 3 segundos',4),
  (ri01,v_tid,'Press de tríceps en polea (tricep pushdown)','Tríceps',3,12,75,'Codos fijos, extensión completa, aprieta tríceps al final',5),
  (ri01,v_tid,'Extension tríceps sobre cabeza','Tríceps',3,12,75,'Codo apuntando al techo, baja mancuerna detrás de la cabeza',6),

  -- ri02: Push-Pull-Legs B (Jalón)
  (ri02,v_tid,'Dominadas asistidas o con banda','Espalda',4,6,180,'Agarre prono, pecho al nivel de la barra, baja completamente',1),
  (ri02,v_tid,'Remo en máquina (cable row)','Espalda',4,10,120,'Siéntate erguido, jala al ombligo, aprieta escápulas al final',2),
  (ri02,v_tid,'Jalón al pecho en polea','Espalda',3,12,90,'Barra ancha, jala hasta el pecho, retrae escápulas antes',3),
  (ri02,v_tid,'Remo con mancuerna unilateral','Espalda',3,10,90,'10 repeticiones cada lado, codo roza el cuerpo al subir',4),
  (ri02,v_tid,'Curl de bíceps con barra','Bíceps',3,10,75,'Agarre supino, sin balanceo, baja completamente cada rep',5),
  (ri02,v_tid,'Curl martillo alternado','Bíceps',3,12,60,'Agarre neutro, contrae en la cima, baja controlado',6),

  -- ri03: Push-Pull-Legs C (Piernas)
  (ri03,v_tid,'Sentadilla con barra trasera','Piernas',4,8,180,'Al menos paralelo, espalda neutra, rodillas siguen punta de pies',1),
  (ri03,v_tid,'Prensa de piernas 45°','Piernas',3,12,120,'Pies a la altura de hombros, baja hasta 90°, no bloquees rodillas',2),
  (ri03,v_tid,'Extensiones de cuádriceps','Piernas',3,15,60,'Extensión completa, mantén 1 segundo, baja lento 3 segundos',3),
  (ri03,v_tid,'Curl femoral tumbado','Piernas',3,12,75,'Flexiona hasta tocarte el glúteo, baja sin rebotar',4),
  (ri03,v_tid,'Hip Thrust con barra','Glúteos',4,10,90,'Barra sobre cresta iliaca con almohadilla, máxima extensión de cadera',5),
  (ri03,v_tid,'Elevaciones de pantorrilla en prensa','Piernas',4,20,30,'Máxima extensión plantar, mantén 1 segundo, baja 3 segundos',6),

  -- ri04: HIIT Metabólico Avanzado
  (ri04,v_tid,'Burpee completo','General',5,8,60,'Movimiento explosivo completo: flexión, salto, palmada arriba',1),
  (ri04,v_tid,'Thrusters con mancuernas','General',4,10,75,'Sentadilla + press overhead en un solo movimiento continuo',2),
  (ri04,v_tid,'Box Jump','Piernas',4,8,90,'Salta al cajón, baja controlado, no rebotas en el aterrizaje',3),
  (ri04,v_tid,'Remo con barra en sumo','Espalda',4,10,75,'Posición sumo, remo explosivo, codos salen hacia afuera',4),
  (ri04,v_tid,'Mountain Climbers rápidos','Core',4,30,45,'30 segundos explosivos, cadera no sube, máxima velocidad',5),
  (ri04,v_tid,'Swing de kettlebell','Glúteos',4,15,60,'Bisagra de cadera explosiva, el peso lo mueven los glúteos, no los brazos',6),

  -- ri05: Fuerza Funcional Completa
  (ri05,v_tid,'Sentadilla overhead con barra','General',4,6,180,'Barra sobre la cabeza, hombros activos, movilidad de cadera clave',1),
  (ri05,v_tid,'Peso muerto convencional','Espalda',4,6,180,'6 repeticiones al 80-85% 1RM, espalda recta, empuja el suelo',2),
  (ri05,v_tid,'Press de banca con pausa','Pecho',3,8,150,'Pausa 2 segundos en el pecho, explosión concéntrica, fuerza real',3),
  (ri05,v_tid,'Remo con barra pendlay','Espalda',3,8,150,'Barra en suelo entre reps, explosivo hacia el pecho, espalda paralela',4),
  (ri05,v_tid,'Zancada caminando con mancuernas','Piernas',3,12,90,'12 pasos cada pierna, torso erguido, rodilla trasera casi al suelo',5),
  (ri05,v_tid,'Press de hombros unilateral','Hombros',3,10,90,'10 cada lado, core activo para estabilizar, sin inclinar el tronco',6),

  -- ri06: Core y Estabilización Avanzada
  (ri06,v_tid,'Rueda abdominal (ab wheel)','Core',4,8,90,'Extensión máxima manteniendo core apretado, no dejes caer la cadera',1),
  (ri06,v_tid,'Pallof press anti-rotación','Core',3,12,60,'12 cada lado, resiste la rotación, mantén 2 segundos al final',2),
  (ri06,v_tid,'Plancha lateral con elevación','Core',3,10,60,'En plancha lateral, eleva cadera extra, 10 cada lado',3),
  (ri06,v_tid,'Elevación de piernas en barra colgado','Core',4,10,75,'Piernas rectas, no balancees, control en el descenso',4),
  (ri06,v_tid,'Dead bug','Core',3,10,60,'Brazo y pierna contrarios simultáneos, espalda baja en el suelo',5),
  (ri06,v_tid,'Rotación de tronco con cable','Core',3,15,45,'15 cada lado, desde el core, no solo con los brazos',6),

  -- ri07: Glúteos y Posterior de Muslo
  (ri07,v_tid,'Hip Thrust con barra (pesado)','Glúteos',5,8,120,'Progresión de carga, agarre de barra ancho, extensión completa de cadera',1),
  (ri07,v_tid,'Peso muerto rumano con barra','Piernas',4,10,120,'Bisagra perfecta, siente el jalón en isquiotibiales, baja hasta espinillas',2),
  (ri07,v_tid,'Curl femoral unilateral','Piernas',3,12,75,'12 cada pierna, flexión completa, baja 3 segundos',3),
  (ri07,v_tid,'Abducción en máquina','Glúteos',4,15,60,'Asiento ajustado, abre completamente, no rebotas',4),
  (ri07,v_tid,'Patada trasera en cable','Glúteos',3,15,60,'15 cada pierna, extensión completa de cadera, no arquees la espalda',5),
  (ri07,v_tid,'Buenos días con barra','Espalda',3,12,90,'Barra en trapecios, bisagra de cadera hasta paralelo, espalda neutra',6),

  -- ri08: Hombros y Brazos Detallado
  (ri08,v_tid,'Press Arnold con mancuernas','Hombros',4,10,120,'Rotación de palmas durante el press, rango completo de movimiento',1),
  (ri08,v_tid,'Elevación lateral en polea baja','Hombros',3,15,60,'Cable cruza el cuerpo, sube hasta 90°, mantén 1 segundo',2),
  (ri08,v_tid,'Face pull con cuerda','Hombros',4,15,60,'Cuerda a la altura de los ojos, rotación externa, codos altos',3),
  (ri08,v_tid,'Curl predicador con barra EZ','Bíceps',3,10,75,'Codos fijos en el pad, baja completamente, no lances el peso',4),
  (ri08,v_tid,'Curl concentrado','Bíceps',3,12,60,'12 cada brazo, aísla el bíceps, máxima contracción en cima',5),
  (ri08,v_tid,'Fondos en paralelas (dips)','Tríceps',4,10,90,'Cuerpo vertical para tríceps, baja hasta 90°, sin trapecio',6),

  -- ri09: Pecho Fuerza y Volumen
  (ri09,v_tid,'Press banca plano (pesado)','Pecho',5,5,240,'5x5 al 85% 1RM, técnica perfecta sobre la intensidad',1),
  (ri09,v_tid,'Press inclinado con mancuernas','Pecho',4,10,120,'Rango completo, pausa al fondo, explosivo hacia arriba',2),
  (ri09,v_tid,'Press declinado en barra','Pecho',3,12,90,'Activa la porción inferior del pectoral, codos a 75°',3),
  (ri09,v_tid,'Aperturas con mancuernas plano','Pecho',3,12,90,'Amplio arco, codos levemente flexionados, siente el estiramiento',4),
  (ri09,v_tid,'Crossover en polea alta','Pecho',3,15,60,'Cruza en el frente hasta abajo, aprieta el pecho en el final',5),
  (ri09,v_tid,'Push-up lastrado','Pecho',3,10,75,'Peso en la espalda o chaleco lastrado, técnica perfecta',6),

  -- ri10: Total Body Intensivo Intermedio
  (ri10,v_tid,'Sentadilla + curl de bíceps','General',4,10,90,'Superset compuesto: sentadilla seguida de curl sin descanso',1),
  (ri10,v_tid,'Peso muerto + remo al pecho','General',4,8,90,'Después del peso muerto, remo en la posición de arriba',2),
  (ri10,v_tid,'Press militar + elevación lateral','General',3,10,75,'Superset de hombros: press + elevaciones sin descanso entre ellos',3),
  (ri10,v_tid,'Hip thrust + abducción','General',4,12,75,'Superset glúteos: hip thrust + abducción con banda sin descanso',4),
  (ri10,v_tid,'Press de banca + jalón al pecho','General',3,12,75,'Antagonistas: pecho y espalda en superset para mayor eficiencia',5),
  (ri10,v_tid,'Zancada + curl femoral','General',3,12,75,'Zancada caminando + curl femoral de pie con banda al terminar',6),

  -- ra01: Arnold Split Día A (Pecho-Espalda)
  (ra01,v_tid,'Press de Banca con Barra (pesado)','Pecho',5,5,240,'Base de la sesión, 85-90% 1RM, técnica perfecta',1),
  (ra01,v_tid,'Dominadas con lastre','Espalda',4,6,180,'Cinturón lastrado, pecho a la barra, baja completamente',2),
  (ra01,v_tid,'Press inclinado mancuernas + Remo Pendlay','General',4,10,120,'Superset antagonista: inclinado + remo pendlay sin descanso',3),
  (ra01,v_tid,'Aperturas planas + Face Pull','General',3,12,75,'Superset: aperturas para pecho + face pull para manguito rotador',4),
  (ra01,v_tid,'Pullover con mancuerna','Espalda',3,12,90,'Estiramiento completo del dorsal, codos levemente flexionados',5),
  (ra01,v_tid,'Press declinado en máquina','Pecho',3,15,60,'Alta repetición al final, bomba sanguínea, finish del pecho',6),

  -- ra02: Arnold Split Día B (Hombros-Brazos)
  (ra02,v_tid,'Press Militar con Barra (pesado)','Hombros',5,5,240,'Movimiento rey de hombros, 80-85% 1RM, explosivo',1),
  (ra02,v_tid,'Press Arnold con mancuernas','Hombros',4,10,120,'Rotación completa, máximo rango de movimiento',2),
  (ra02,v_tid,'Elevación lateral + posterior en máquina','Hombros',4,12,75,'Superset: deltoides lateral + deltoides posterior sin descanso',3),
  (ra02,v_tid,'Curl barra EZ + Extensión tríceps con barra','General',4,10,90,'Superset bíceps-tríceps, máxima congestión en brazos',4),
  (ra02,v_tid,'Curl concentrado unilateral','Bíceps',3,12,60,'Aísla completamente el bíceps, pico máximo de contracción',5),
  (ra02,v_tid,'Fondos en paralelas lastrados','Tríceps',3,10,90,'Lastre para progresar, cuerpo vertical, tríceps dominantes',6),

  -- ra03: Arnold Split Día C (Piernas-Abdomen)
  (ra03,v_tid,'Sentadilla con barra (pesada)','Piernas',5,5,300,'El rey de los ejercicios: 85-90% 1RM, profundidad completa',1),
  (ra03,v_tid,'Prensa 45° con pie alto','Piernas',4,10,150,'Pie alto activa más los isquiotibiales y glúteos',2),
  (ra03,v_tid,'Peso muerto rumano con barra','Piernas',4,8,150,'80% 1RM, isquiotibiales al límite, espalda perfectamente neutra',3),
  (ra03,v_tid,'Hack Squat en máquina','Piernas',3,12,120,'Variante que protege la espalda, cuádriceps dominante',4),
  (ra03,v_tid,'Elevación de piernas en paralelas','Core',4,15,60,'Piernas rectas o rodillas al pecho, control total',5),
  (ra03,v_tid,'Rueda abdominal desde rodillas','Core',3,10,60,'Extensión máxima sin dejar caer las caderas, regresa sin inercia',6),

  -- ra04: Powerlifting Base
  (ra04,v_tid,'Sentadilla de competición','Piernas',5,3,300,'Equipamiento de powerlifting si disponible, 90-95% 1RM',1),
  (ra04,v_tid,'Press de Banca de competición','Pecho',5,3,300,'Pausa obligatoria en el pecho, señal imaginaria del árbitro',2),
  (ra04,v_tid,'Peso Muerto de competición','Espalda',5,2,360,'Sumo o convencional según especialidad, sets cortos máxima tensión',3),
  (ra04,v_tid,'Good Morning con barra','Espalda',3,8,150,'Fortalece espalda baja y cadena posterior, espalda neutral',4),
  (ra04,v_tid,'Press de Banca con pausa extendida','Pecho',3,5,180,'Pausa 3-5 segundos en el pecho, desarrolla fuerza en punto muerto',5),
  (ra04,v_tid,'Sentadilla frontal','Piernas',3,5,180,'Desarrolla cuádriceps y movilidad para mejorar sentadilla trasera',6),

  -- ra05: Atlético Explosivo
  (ra05,v_tid,'Salto de cajón (Box Jump)','Piernas',5,5,120,'Máxima explosividad, aterriza suave, baja caminando nunca saltando',1),
  (ra05,v_tid,'Cargada con mancuernas (DB Clean)','General',4,5,150,'Explosión desde el suelo, recibe en rack, técnica sobre peso',2),
  (ra05,v_tid,'Sprint en cinta 10 segundos','Cardio',6,10,180,'Velocidad máxima 10 segundos, descanso completo entre sprints',3),
  (ra05,v_tid,'Salto de longitud','Piernas',4,5,120,'Máxima distancia, aterrizaje suave con rodillas semiflexionadas',4),
  (ra05,v_tid,'Lanzamiento de balón medicinal (slam)','General',4,8,90,'Lanza con máxima fuerza, atrapa y repite, full body explosivo',5),
  (ra05,v_tid,'Sentadilla con salto lastrada','Piernas',4,6,120,'Chaleco 5-10% peso corporal, explosión máxima en cada salto',6),

  -- ra06: Hipertrofia Bloque Superior
  (ra06,v_tid,'Press Banca Plano (volumen)','Pecho',5,12,90,'75% 1RM, alto volumen, técnica consistente en todas las series',1),
  (ra06,v_tid,'Remo con Barra (volumen)','Espalda',5,12,90,'Antagonista del press, mismo volumen, espalda como espejo del pecho',2),
  (ra06,v_tid,'Press Inclinado Mancuernas + Jalón Agarre Neutro','General',4,12,75,'Superset de alta fatiga: inclinado + jalón neutro sin descanso',3),
  (ra06,v_tid,'Press militar mancuernas + Remo al mentón','General',4,12,60,'Superset hombros: press + remo con barra EZ agarre cerrado',4),
  (ra06,v_tid,'Curl Bíceps Inclinado (énfasis cabeza larga)','Bíceps',4,12,60,'En banco 45°, mayor estiramiento de cabeza larga del bíceps',5),
  (ra06,v_tid,'Extensión cráneo (Skull Crusher) + Press Cerrado','Tríceps',4,12,60,'Dropset: skull crusher al fallo + press cerrado hasta nuevo fallo',6),

  -- ra07: Hipertrofia Bloque Inferior
  (ra07,v_tid,'Sentadilla Frontal','Piernas',4,10,180,'Cuádriceps dominante, alta demanda técnica, rango completo',1),
  (ra07,v_tid,'Sentadilla Trasera (volumen)','Piernas',4,12,150,'Después de frontal, mayor volumen de trabajo',2),
  (ra07,v_tid,'Prensa 45° con Hack Squat','Piernas',3,15,120,'Superset piernas: prensa + hack squat sin descanso',3),
  (ra07,v_tid,'Peso Muerto Rumano Unilateral','Piernas',4,10,90,'10 cada pierna, mayor activación de glúteo y control pélvico',4),
  (ra07,v_tid,'Curl Femoral Sentado (peak contraction)','Piernas',4,12,75,'Mantén 2 segundos en contracción máxima, baja muy lento',5),
  (ra07,v_tid,'Gemelos en prensa + Tibiales','Piernas',4,20,45,'Superset: gemelos en prensa + flexión dorsal de tobillo',6),

  -- ra08: CrossFit WOD Adaptado Avanzado
  (ra08,v_tid,'Power Clean con barra','General',5,3,180,'Técnica perfecta, explosión desde el suelo al rack, sin rebote',1),
  (ra08,v_tid,'Thruster (Sentadilla + Press)','General',4,10,120,'Barra en rack, sentadilla profunda, press overhead explosivo',2),
  (ra08,v_tid,'Muscle Up asistido en anillas','General',3,5,150,'Transición de jalón a fondos en anillas, máxima coordinación',3),
  (ra08,v_tid,'Wall Ball (balón medicinal a pared)','General',4,15,90,'Sentadilla profunda + lanzamiento al punto marcado en la pared',4),
  (ra08,v_tid,'Double Under (cuerda doble)','Cardio',5,30,60,'30 consecutivos, muñecas rápidas, salto elevado y consistente',5),
  (ra08,v_tid,'Toes to Bar colgado en barra','Core',4,10,90,'Piernas rectas al nivel de la barra, core siempre activo',6),

  -- ra09: Torso Completo Elite
  (ra09,v_tid,'Press de Banca con Bandas de resistencia','Pecho',5,5,240,'Bandas desde suelo, mayor tensión al final: entrena la aceleración',1),
  (ra09,v_tid,'Peso Muerto Sumo (variante torso)','Espalda',4,6,210,'Posición sumo, mayor activación de dorsales y trapecio',2),
  (ra09,v_tid,'Press Militar Estricto (sin impulso)','Hombros',4,8,150,'Cero impulso de piernas, pura fuerza de hombros y core',3),
  (ra09,v_tid,'Dominadas Lastradas agarre prono','Espalda',4,6,150,'Lastre progresivo, pecho a la barra, baja completamente',4),
  (ra09,v_tid,'Trabajo correctivo: Rotadores externos','Hombros',3,15,60,'Band pull-apart + rotación externa con mancuerna liviana, salud del hombro',5),
  (ra09,v_tid,'Face Pull + Elevación Lateral Isométrica','Hombros',3,12,60,'Superset de hombros posteriores y laterales para equilibrio',6),

  -- ra10: Periodización Ondulante Piernas
  (ra10,v_tid,'Sentadilla Barra (bloque fuerza 3-5 reps)','Piernas',5,4,240,'90% 1RM, fuerza máxima, descanso completo entre series',1),
  (ra10,v_tid,'Prensa 45° (bloque hipertrofia 8-12 reps)','Piernas',4,10,120,'75% RM, moderada intensidad, congestión muscular',2),
  (ra10,v_tid,'Extensión cuádriceps (bloque resistencia 15-20)','Piernas',3,18,60,'60% RM, tensión muscular continua, sin bloquear rodilla',3),
  (ra10,v_tid,'Peso Muerto Barra (bloque fuerza 3-5 reps)','Piernas',4,4,240,'Cadena posterior, mismo esquema de fuerza',4),
  (ra10,v_tid,'Curl femoral (bloque hipertrofia 8-12 reps)','Piernas',3,10,90,'Isquiotibiales: contracción máxima en flexión',5),
  (ra10,v_tid,'Hip Thrust Barra (bloque resistencia 15-20)','Glúteos',3,18,60,'Glúteos: alto volumen, corto descanso, máxima bomba muscular',6);

  -- ══════════════════════════════════════════════════════════════
  -- SUBSCRIPTION PLANS
  -- ══════════════════════════════════════════════════════════════

  -- plan_tier must be explicit (column has a non-standard DEFAULT in remote DB)
  -- Allowed values: NULL, 'beginner', 'intermediate', 'advanced'
  INSERT INTO public.plans
    (tenant_id, name, description, price, currency, billing_cycle, features, is_active, sort_order, plan_tier)
  VALUES
  -- ── Básico ────────────────────────────────────────────────────
  (v_tid,
   'Plan Básico Mensual',
   'El punto de entrada perfecto para comenzar tu transformación. Acceso a rutinas de nivel principiante, plan nutricional de inicio y app móvil para seguir tu progreso diario.',
   15000.00, 'CRC', 'monthly',
   '["Rutinas nivel principiante", "1 plan nutricional básico", "App móvil incluida", "Acceso al área de cardio", "Soporte por email"]'::jsonb,
   true, 1, 'beginner'),

  (v_tid,
   'Plan Básico Anual',
   'Todos los beneficios del plan básico mensual con el ahorro de 2 meses gratis. El mejor inicio para quienes se comprometen con su salud a largo plazo.',
   145000.00, 'CRC', 'yearly',
   '["Rutinas nivel principiante", "1 plan nutricional básico", "App móvil incluida", "Acceso al área de cardio", "2 meses gratis vs mensual", "Soporte prioritario"]'::jsonb,
   true, 2, 'beginner'),

  -- ── Intermedio ────────────────────────────────────────────────
  (v_tid,
   'Plan Intermedio Mensual',
   'Para quienes ya tienen experiencia y buscan llevar su entrenamiento al siguiente nivel. Acceso completo a rutinas básicas e intermedias, 2 consultas nutricionales y clases grupales.',
   25000.00, 'CRC', 'monthly',
   '["Rutinas nivel básico e intermedio", "2 consultas nutricionales/mes", "Área de cardio y pesas", "1 clase grupal/mes incluida", "App móvil incluida", "Seguimiento de progreso"]'::jsonb,
   true, 3, 'intermediate'),

  (v_tid,
   'Plan Intermedio Anual',
   'Acceso completo al nivel intermedio con ahorro significativo. Incluye clases grupales ilimitadas y acceso a todos los planes nutricionales intermedios.',
   245000.00, 'CRC', 'yearly',
   '["Rutinas nivel básico e intermedio", "2 consultas nutricionales/mes", "Área de cardio y pesas", "Clases grupales ilimitadas", "App móvil incluida", "2 meses gratis vs mensual", "Evaluación corporal semestral"]'::jsonb,
   true, 4, 'intermediate'),

  -- ── Premium ───────────────────────────────────────────────────
  (v_tid,
   'Plan Premium Mensual',
   'La experiencia completa sin compromisos de largo plazo. Acceso a todo el contenido, 4 consultas nutricionales mensuales, 2 sesiones con entrenador personal y clases ilimitadas.',
   45000.00, 'CRC', 'monthly',
   '["Acceso completo a TODO el contenido", "4 consultas nutricionales/mes", "2 sesiones con PT/mes", "Clases grupales ilimitadas", "Plan nutricional personalizado", "App móvil premium", "Soporte por WhatsApp"]'::jsonb,
   true, 5, 'advanced'),

  (v_tid,
   'Plan Premium Anual',
   'El plan más completo con el mayor ahorro. 2 meses gratis, todas las sesiones con entrenador personal incluidas y seguimiento nutricional mensual con ajuste de plan.',
   440000.00, 'CRC', 'yearly',
   '["Acceso completo a TODO el contenido", "4 consultas nutricionales/mes", "2 sesiones con PT/mes", "Clases grupales ilimitadas", "Plan nutricional personalizado mensual", "App móvil premium", "2 meses gratis vs mensual", "Evaluación corporal trimestral"]'::jsonb,
   true, 6, 'advanced'),

  -- ── Especializados ────────────────────────────────────────────
  (v_tid,
   'Plan Solo Nutrición',
   'Para quienes solo buscan apoyo en alimentación. Acceso completo a planes nutricionales de todos los niveles, seguimiento de macros en app y consulta mensual con nutricionista.',
   12000.00, 'CRC', 'monthly',
   '["Todos los planes nutricionales (15+)", "1 consulta nutricional/mes", "Seguimiento de macros en app", "Recetario digital actualizado", "Tips y educación nutricional semanal"]'::jsonb,
   true, 7, NULL),

  (v_tid,
   'Plan Solo Entrenamiento',
   'Acceso completo a la biblioteca de rutinas para quien ya tiene su nutrición bajo control. Todos los niveles disponibles con seguimiento de cargas y progreso.',
   18000.00, 'CRC', 'monthly',
   '["Acceso a rutinas todos los niveles (30+)", "Biblioteca de videos de ejercicios", "Seguimiento de cargas y progreso", "Programa mensual personalizado", "Acceso al área de pesas y cardio"]'::jsonb,
   true, 8, NULL),

  -- ── Pareja ────────────────────────────────────────────────────
  (v_tid,
   'Plan Pareja Mensual',
   'El plan intermedio para dos personas a precio especial. Entrenen juntos, compartan metas y se motiven mutuamente. Perfecto para parejas que buscan un estilo de vida activo.',
   38000.00, 'CRC', 'monthly',
   '["Plan Intermedio para 2 personas", "Rutinas en pareja incluidas", "2 consultas nutricionales/mes compartidas", "Ahorro 25% vs 2 planes individuales", "App móvil para cada miembro"]'::jsonb,
   true, 9, NULL),

  (v_tid,
   'Plan Pareja Anual',
   'El mayor ahorro para parejas comprometidas con su salud. 3 meses gratis comparado con el mensual y acceso a clases de pareja exclusivas.',
   370000.00, 'CRC', 'yearly',
   '["Plan Intermedio para 2 personas", "Rutinas en pareja incluidas", "2 consultas nutricionales/mes", "3 meses gratis vs plan pareja mensual", "App móvil premium para cada uno", "1 sesión de foto-progreso semestral"]'::jsonb,
   true, 10, NULL),

  -- ── Familiar y Social ─────────────────────────────────────────
  (v_tid,
   'Plan Familiar',
   'Hasta 4 miembros de la familia con planes adaptados a cada edad y condición. Incluye rutinas para adultos mayores, adultos y jóvenes. La salud es un asunto de familia.',
   55000.00, 'CRC', 'monthly',
   '["Hasta 4 miembros de familia", "Planes adaptados por edad y nivel", "Consulta nutricional familiar mensual", "Rutinas multigeneracionales", "App móvil para cada miembro", "Soporte familiar prioritario"]'::jsonb,
   true, 11, NULL),

  (v_tid,
   'Plan Estudiante',
   'Precio especial para universitarios y estudiantes con carnet vigente. Misma calidad, accesible para el presupuesto estudiantil. Invierte en tu salud desde joven.',
   10000.00, 'CRC', 'monthly',
   '["Acceso básico con carnet estudiantil", "Rutinas nivel principiante", "1 consulta nutricional/mes", "App móvil incluida", "Comunidad estudiantil fitness"]'::jsonb,
   true, 12, 'beginner'),

  -- ── Elite VIP ─────────────────────────────────────────────────
  (v_tid,
   'Plan Elite VIP Mensual',
   'La experiencia más exclusiva sin compromiso anual. Entrenador personal dedicado, nutricionista personal, evaluación corporal mensual y acceso VIP ilimitado.',
   85000.00, 'CRC', 'monthly',
   '["Entrenador personal dedicado (4 ses/mes)", "Nutricionista personal disponible", "Plan nutricional 100% personalizado", "Evaluación corporal mensual detallada", "Acceso VIP sin restricciones", "Locker y toalla incluidos", "Bebida post-entreno incluida"]'::jsonb,
   true, 13, NULL),

  (v_tid,
   'Plan Elite VIP Anual',
   'El pináculo de la experiencia fitness personalizada. Todo lo del VIP mensual con 2 meses gratis, análisis de sangre semestral y ropa deportiva de marca incluida.',
   820000.00, 'CRC', 'yearly',
   '["Entrenador personal dedicado (4 ses/mes)", "Nutricionista personal disponible", "Plan nutricional 100% personalizado", "Evaluación corporal mensual", "Acceso VIP sin restricciones", "2 meses gratis vs mensual", "Análisis de sangre semestral", "Kit de ropa deportiva al inicio"]'::jsonb,
   true, 14, NULL),

  -- ── One-Time / Pack ───────────────────────────────────────────
  (v_tid,
   'Evaluación Corporal Completa',
   'Una sesión exhaustiva de 90 minutos: análisis de composición corporal (% grasa, masa muscular, hidratación), prueba de resistencia cardiovascular, evaluación postural y plan de acción personalizado.',
   35000.00, 'CRC', 'one_time',
   '["Análisis composición corporal completo", "Prueba de resistencia cardiovascular", "Evaluación postural y biomecánica", "Plan de acción personalizado 30 días", "Informe PDF detallado vía email"]'::jsonb,
   true, 15, NULL),

  (v_tid,
   'Pack Inicio 3 Meses',
   'El impulso perfecto para comenzar sin compromiso de largo plazo. Tres meses del plan básico, 2 sesiones con entrenador personal y evaluación de inicio y cierre incluidas.',
   65000.00, 'CRC', 'one_time',
   '["3 meses plan básico completo", "Evaluación corporal de inicio", "Plan nutricional del primer mes", "2 sesiones PT en el período", "Evaluación de cierre con progreso", "Sin renovación automática"]'::jsonb,
   true, 16, NULL),

  (v_tid,
   'Consulta Nutricional Individual',
   'Una consulta completa de 60 minutos con nuestro nutricionista deportivo. Análisis de hábitos, plan nutricional de 30 días y seguimiento por WhatsApp la primera semana.',
   18000.00, 'CRC', 'one_time',
   '["Consulta 60 minutos con nutricionista", "Análisis detallado de hábitos alimenticios", "Plan nutricional personalizado 30 días", "Seguimiento WhatsApp primera semana", "Archivo digital de tu plan"]'::jsonb,
   true, 17, NULL);

  -- ══════════════════════════════════════════════════════════════
  -- PROMOTIONS
  -- ══════════════════════════════════════════════════════════════

  INSERT INTO public.promotions
    (tenant_id, title, description, type, discount_percentage, discount_amount,
     start_date, end_date, is_active, created_by)
  VALUES
  (v_tid,
   'Año Nuevo, Cuerpo Nuevo 🎯',
   'Empieza el año con el pie derecho. 20% de descuento en todos los planes mensuales durante enero. El mejor momento para comprometerte con tu salud y transformación personal.',
   'discount', 20.00, NULL,
   '2026-01-01', '2026-01-31',
   false, v_uid),

  (v_tid,
   'San Valentín Fitness ❤️',
   'Regálate o regala salud este San Valentín. 15% de descuento en planes de pareja y familiares. Porque el mayor regalo es invertir en el bienestar de quienes amas.',
   'discount', 15.00, NULL,
   '2026-02-01', '2026-02-14',
   false, v_uid),

  (v_tid,
   'Semana Saludable Nacional 🏃',
   'Celebramos la actividad física con descuentos especiales toda la semana. 25% de descuento en planes básico e intermedio. ¡Tu mejor versión comienza hoy!',
   'discount', 25.00, NULL,
   '2026-04-06', '2026-04-12',
   true, v_uid),

  (v_tid,
   'Plan Referido — Trae un Amigo 👥',
   '₡5,000 de descuento para ti y ₡5,000 para tu amigo al referir un nuevo miembro. Válido en cualquier plan mensual. El fitness es mejor en comunidad y tú lo sabes.',
   'discount', NULL, 5000.00,
   '2026-01-01', '2026-12-31',
   true, v_uid),

  (v_tid,
   'Black Friday Fitness 🖤',
   'El descuento más grande del año: 30% en TODOS los planes durante 3 días únicamente. Solo una vez al año, no lo dejes pasar. Corre antes que se acaben.',
   'discount', 30.00, NULL,
   '2026-11-27', '2026-11-29',
   false, v_uid),

  (v_tid,
   'Día del Padre Activo 💪',
   'Papá merece lo mejor. ₡10,000 de descuento en planes mensuales durante la semana del Día del Padre. Salud y bienestar como regalo para el hombre que más quieres.',
   'discount', NULL, 10000.00,
   '2026-06-15', '2026-06-21',
   false, v_uid),

  (v_tid,
   'Temporada Alta — Cierre de Año 🎄',
   '20% de descuento en planes anuales para cerrar el año con una meta clara para el siguiente. Paga ahora, empieza en enero, y aprovecha el precio del 2025.',
   'discount', 20.00, NULL,
   '2026-12-01', '2026-12-31',
   false, v_uid);

END $$;
