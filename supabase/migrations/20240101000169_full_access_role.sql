-- New role 'full_access': a superset of 'admin' — everything admin can do,
-- plus the one thing admin now can't: manage correspondence (SMTP config,
-- email templates, communication rules). 'admin' itself is unchanged except
-- that it never receives the new tenant.manage_correspondence permission.
--
-- has_permission()-based checks (the vast majority of RLS in this schema)
-- need no changes at all — full_access simply gets a copy of every
-- role_permissions row admin has, so any policy/function that goes through
-- has_permission() already treats it identically to admin. The only things
-- that need touching are the handful of places that hardcode
-- `role.name = 'admin'` directly instead of going through has_permission():
-- 6 functions and 11 RLS policies (mapped below), audited against what's
-- actually live in production, not just migration history.

DO $$
DECLARE
  v_admin_id       UUID;
  v_full_access_id UUID;
  v_perm_id        UUID;
BEGIN
  SELECT id INTO v_admin_id FROM public.roles WHERE name = 'admin';

  INSERT INTO public.roles (name, description, is_system)
  SELECT 'full_access', 'Acceso administrativo completo, incluye Correspondencia y configuraciones sensibles', true
  WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'full_access');

  SELECT id INTO v_full_access_id FROM public.roles WHERE name = 'full_access';

  -- New permission, granted only to full_access
  INSERT INTO public.permissions (code, description, module)
  SELECT 'tenant.manage_correspondence', 'Gestionar configuración SMTP, plantillas y reglas de correspondencia', 'tenant'
  WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE code = 'tenant.manage_correspondence');

  SELECT id INTO v_perm_id FROM public.permissions WHERE code = 'tenant.manage_correspondence';

  -- full_access = every permission admin currently has...
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_full_access_id, rp.permission_id
  FROM public.role_permissions rp
  WHERE rp.role_id = v_admin_id
    AND NOT EXISTS (
      SELECT 1 FROM public.role_permissions existing
      WHERE existing.role_id = v_full_access_id AND existing.permission_id = rp.permission_id
    );

  -- ...plus the new correspondence permission (admin does NOT get this one).
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_full_access_id, v_perm_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role_id = v_full_access_id AND permission_id = v_perm_id
  );
END $$;

-- ============================================================
-- RLS policies with a hardcoded role name — add full_access alongside admin
-- ============================================================

DROP POLICY IF EXISTS "staff_manage_offer_plans" ON public.offer_plans;
CREATE POLICY "staff_manage_offer_plans" ON public.offer_plans
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.promotions pr
    JOIN public.user_roles ur ON ur.tenant_id = pr.tenant_id
    JOIN public.roles r ON r.id = ur.role_id AND r.name = ANY (ARRAY['admin', 'coach', 'full_access'])
    WHERE pr.id = offer_plans.offer_id AND ur.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.promotions pr
    JOIN public.user_roles ur ON ur.tenant_id = pr.tenant_id
    JOIN public.roles r ON r.id = ur.role_id AND r.name = ANY (ARRAY['admin', 'coach', 'full_access'])
    WHERE pr.id = offer_plans.offer_id AND ur.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "user_badges_admin_all" ON public.user_badges;
CREATE POLICY "user_badges_admin_all" ON public.user_badges
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = user_badges.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = user_badges.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ));

DROP POLICY IF EXISTS "challenges_admin_all" ON public.challenges;
CREATE POLICY "challenges_admin_all" ON public.challenges
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = challenges.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = challenges.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ));

DROP POLICY IF EXISTS "user_game_stats_admin_all" ON public.user_game_stats;
CREATE POLICY "user_game_stats_admin_all" ON public.user_game_stats
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = user_game_stats.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = user_game_stats.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ));

DROP POLICY IF EXISTS "xp_transactions_admin_select" ON public.xp_transactions;
CREATE POLICY "xp_transactions_admin_select" ON public.xp_transactions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = xp_transactions.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ));

DROP POLICY IF EXISTS "challenge_participants_admin_all" ON public.challenge_participants;
CREATE POLICY "challenge_participants_admin_all" ON public.challenge_participants
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.challenges c
    JOIN public.profiles p ON true
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE c.id = challenge_participants.challenge_id AND p.id = auth.uid() AND p.tenant_id = c.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.challenges c
    JOIN public.profiles p ON true
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE c.id = challenge_participants.challenge_id AND p.id = auth.uid() AND p.tenant_id = c.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ));

DROP POLICY IF EXISTS "gym_checkins_admin_all" ON public.gym_checkins;
CREATE POLICY "gym_checkins_admin_all" ON public.gym_checkins
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = gym_checkins.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = gym_checkins.tenant_id
      AND r.name = ANY (ARRAY['admin', 'superadmin', 'full_access'])
  ));

DROP POLICY IF EXISTS "notification_queue_admin_read" ON public.notification_queue;
CREATE POLICY "notification_queue_admin_read" ON public.notification_queue
  FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = public.get_tenant_id()
        AND r.name = ANY (ARRAY['admin', 'full_access'])
    )
  );

DROP POLICY IF EXISTS "notification_broadcasts_admin_read" ON public.notification_broadcasts;
CREATE POLICY "notification_broadcasts_admin_read" ON public.notification_broadcasts
  FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = public.get_tenant_id()
        AND r.name = ANY (ARRAY['admin', 'super_admin', 'full_access'])
    )
  );

DROP POLICY IF EXISTS "notification_broadcasts_admin_insert" ON public.notification_broadcasts;
CREATE POLICY "notification_broadcasts_admin_insert" ON public.notification_broadcasts
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND sent_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = public.get_tenant_id()
        AND r.name = ANY (ARRAY['admin', 'super_admin', 'full_access'])
    )
  );

DROP POLICY IF EXISTS "branches_admin_all" ON public.branches;
CREATE POLICY "branches_admin_all" ON public.branches
  FOR ALL
  USING (
    tenant_id = public.get_tenant_id_or_null()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles ro ON ro.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = public.get_tenant_id_or_null()
        AND ro.name = ANY (ARRAY['admin', 'full_access'])
    )
  )
  WITH CHECK (
    tenant_id = public.get_tenant_id_or_null()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles ro ON ro.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = public.get_tenant_id_or_null()
        AND ro.name = ANY (ARRAY['admin', 'full_access'])
    )
  );

-- ============================================================
-- Functions with a hardcoded role name — add full_access alongside admin
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_user_to_branch(p_user_id uuid, p_branch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_tenant_id uuid;
    v_is_admin  boolean;
BEGIN
    v_tenant_id := public.get_tenant_id();

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND r.name = ANY (ARRAY['admin', 'full_access'])
          AND ur.tenant_id = v_tenant_id
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Solo administradores pueden reasignar sucursales';
    END IF;

    IF p_branch_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.branches
            WHERE id = p_branch_id
              AND tenant_id = v_tenant_id
        ) THEN
            RAISE EXCEPTION 'La sucursal indicada no pertenece al tenant actual';
        END IF;
    END IF;

    UPDATE public.profiles
    SET    branch_id  = p_branch_id,
           updated_at = now()
    WHERE  id        = p_user_id
      AND  tenant_id = v_tenant_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID;
  v_tenant_id UUID;
  v_has_permission BOOLEAN := FALSE;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT public.get_tenant_id() INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  BEGIN
    SELECT public.has_permission('tenant.manage_users')
    INTO v_has_permission;
  EXCEPTION
    WHEN OTHERS THEN
      v_has_permission := FALSE;
  END;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles ro ON ro.id = ur.role_id
    WHERE ur.user_id = v_uid
      AND ur.tenant_id = v_tenant_id
      AND ro.name = ANY (ARRAY['admin', 'full_access'])
  )
  INTO v_is_admin;

  RETURN COALESCE(v_has_permission, FALSE) OR COALESCE(v_is_admin, FALSE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_notifications_for_users(p_tenant_id uuid, p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id  UUID;
  v_is_admin   BOOLEAN;
  v_row        JSONB;
  v_user_id    UUID;
  v_count      INTEGER := 0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles ro ON ro.id = ur.role_id
    WHERE ur.user_id = v_caller_id
      AND ur.tenant_id = p_tenant_id
      AND ro.name = ANY (ARRAY['admin', 'full_access'])
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Caller is not an admin in tenant %', p_tenant_id;
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_user_id := (v_row->>'user_id')::UUID;

    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_user_id AND tenant_id = p_tenant_id
    ) THEN
      RAISE WARNING 'Skipping user_id % — not in tenant %', v_user_id, p_tenant_id;
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (
      user_id, tenant_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      v_user_id, p_tenant_id, (v_row->>'type')::TEXT, (v_row->>'title')::TEXT, (v_row->>'message')::TEXT,
      (v_row->>'related_entity_type')::TEXT,
      CASE WHEN v_row->>'related_entity_id' IS NOT NULL THEN (v_row->>'related_entity_id')::UUID ELSE NULL END
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_admin_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id      UUID;
  v_admin_role_ids UUID[];
BEGIN
  v_tenant_id := public.get_tenant_id();
  IF v_tenant_id IS NULL THEN RETURN '{}'; END IF;

  SELECT ARRAY_AGG(id) INTO v_admin_role_ids FROM roles WHERE name = ANY (ARRAY['admin', 'full_access']);
  IF v_admin_role_ids IS NULL THEN RETURN '{}'; END IF;

  RETURN ARRAY(
    SELECT user_id FROM user_roles
    WHERE tenant_id = v_tenant_id
      AND role_id   = ANY (v_admin_role_ids)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_staff_on_new_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id UUID;
BEGIN
  IF NEW.approval_status != 'pending' THEN
    RETURN NEW;
  END IF;

  FOR v_admin_id IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.tenant_id = NEW.tenant_id
      AND r.name       = ANY (ARRAY['admin', 'full_access'])
  LOOP
    BEGIN
      INSERT INTO public.notifications (
        user_id, tenant_id, type, title, message, related_entity_type, related_entity_id
      ) VALUES (
        v_admin_id, NEW.tenant_id, 'user_registered', 'Nuevo registro pendiente',
        COALESCE(NEW.full_name, 'Un nuevo usuario') || ' se registró y espera aprobación.',
        'profile', NEW.id
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- list_appointments (000168 added is_platform_admin() — this adds full_access
-- alongside the tenant-scoped 'admin' role name check).
CREATE OR REPLACE FUNCTION public.list_appointments(
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id                UUID,
  title             TEXT,
  description       TEXT,
  start_time        TIMESTAMPTZ,
  end_time          TIMESTAMPTZ,
  status            TEXT,
  appointment_type  TEXT,
  location          TEXT,
  meeting_url       TEXT,
  group_mode        TEXT,
  coach_id          UUID,
  coach_name        TEXT,
  client_id         UUID,
  client_name       TEXT,
  client_avatar     TEXT,
  branch_id         UUID,
  class_template_id UUID,
  max_participants  INT,
  participants      JSONB
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

  v_is_admin := public.is_platform_admin() OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles ro ON ro.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = v_tenant_id
      AND ro.name = ANY (ARRAY['admin', 'full_access'])
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
    a.branch_id,
    a.class_template_id,
    a.max_participants,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',         pp.id,
          'full_name',  pp.full_name,
          'avatar_url', pp.avatar_url,
          'status',     ap.status,
          'participant_id', ap.id
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
    AND (
      v_is_admin
      OR a.coach_id = auth.uid()
      OR a.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.appointment_participants ap
        WHERE ap.appointment_id = a.id AND ap.user_id = auth.uid()
      )
    )
    AND (p_start_time IS NULL OR a.start_time >= p_start_time)
    AND (p_end_time   IS NULL OR a.start_time <  p_end_time)
  ORDER BY a.start_time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_appointments(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;

-- ============================================================
-- Reassign argymsaas@gmail.com from admin to full_access in ARGYM
-- ============================================================
UPDATE public.user_roles
SET role_id = (SELECT id FROM public.roles WHERE name = 'full_access')
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'argymsaas@gmail.com')
  AND tenant_id = '1101f246-8804-4ffb-b0a8-50f9ce7925da'
  AND role_id = (SELECT id FROM public.roles WHERE name = 'admin');
