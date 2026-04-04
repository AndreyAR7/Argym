-- ============================================================
-- Fix: Admin can query pending users reliably
-- Root cause: profiles_admin_read_all requires has_permission('tenant.manage_users')
-- but role_permissions may not be seeded yet in all environments.
-- Solution: SECURITY DEFINER RPC that bypasses RLS for admin user listing.
-- ============================================================

-- ── 1. Seed roles if not already present ─────────────────────
INSERT INTO public.roles (name, description, is_system)
VALUES
  ('admin', 'Administrador del sistema', TRUE),
  ('coach', 'Entrenador / Coach', TRUE),
  ('client', 'Cliente', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ── 2. Seed permissions if not already present ───────────────
INSERT INTO public.permissions (code, description, module)
VALUES
  ('tenant.manage_users',   'Gestionar usuarios del tenant',   'admin'),
  ('tenant.manage_roles',   'Gestionar roles del tenant',      'admin'),
  ('tenant.manage_modules', 'Gestionar módulos del tenant',    'admin'),
  ('tenant.view_reports',   'Ver reportes del tenant',         'admin'),
  ('content.manage',        'Gestionar contenido',             'content'),
  ('appointments.manage',   'Gestionar citas',                 'appointments'),
  ('clients.view',          'Ver clientes',                    'clients'),
  ('clients.manage',        'Gestionar clientes',              'clients')
ON CONFLICT (code) DO NOTHING;

-- ── 3. Assign all permissions to admin role ───────────────────
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- ── 4. Assign relevant permissions to coach role ─────────────
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'appointments.manage', 'clients.view', 'content.manage'
)
WHERE r.name = 'coach'
ON CONFLICT DO NOTHING;

-- ── 5. RPC: get_users_by_approval_status ─────────────────────
-- SECURITY DEFINER so it bypasses RLS.
-- Only callable by users who are admins in their tenant
-- (checked inside the function).
CREATE OR REPLACE FUNCTION public.get_users_by_approval_status(
  p_status TEXT
)
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
  requested_role  TEXT,
  approval_status TEXT,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ
) AS $$
DECLARE
  v_tenant_id UUID;
  v_is_admin  BOOLEAN;
BEGIN
  -- Get caller's tenant
  SELECT tenant_id INTO v_tenant_id
  FROM public.profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Check caller is admin in their tenant (by role name, not permission code)
  -- This is more robust when permissions aren't fully seeded yet
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles ro ON ro.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = v_tenant_id
      AND ro.name = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can list users by approval status';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.requested_role,
    p.approval_status,
    p.rejection_reason,
    p.created_at
  FROM public.profiles p
  WHERE p.tenant_id = v_tenant_id
    AND p.approval_status = p_status
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_users_by_approval_status(TEXT) TO authenticated;

-- ── 6. Also fix: profiles_admin_read_all to use role name check ──
-- Drop the permission-based policy and replace with role-name check
-- so it works even before permissions are seeded.
DROP POLICY IF EXISTS "profiles_admin_read_all" ON public.profiles;

CREATE POLICY "profiles_admin_read_all"
  ON public.profiles
  FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles ro ON ro.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.get_tenant_id()
        AND ro.name = 'admin'
    )
  );
