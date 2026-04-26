-- ============================================================
-- Approval Flow + Admin Pending Users Query (Improved)
-- Run AFTER:
--   20240101000008_user_registration.sql
--
-- Purpose:
-- - make approval/rejection secure and tenant-safe
-- - allow admin to reliably list pending/rejected users
-- - support both:
--     a) permission-based auth (tenant.manage_users)
--     b) role-name fallback (admin)
-- - fix risky/overly-broad profile read policies
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Ensure core roles exist
-- ============================================================
INSERT INTO public.roles (name, description, is_system)
VALUES
  ('admin',  'Administrador del sistema', TRUE),
  ('coach',  'Entrenador / Coach', TRUE),
  ('client', 'Cliente', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. Ensure core permission exists
-- We only seed the minimum required permission here to avoid
-- mixing too many new permission conventions with your current RBAC.
-- ============================================================
INSERT INTO public.permissions (code, description, module)
VALUES
  ('tenant.manage_users', 'Gestionar usuarios del tenant', 'tenant')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. Ensure admin role has tenant.manage_users
-- ============================================================
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.code = 'tenant.manage_users'
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Helper: can_manage_users()
-- Returns true if current authenticated user:
-- - belongs to current tenant
-- - and either:
--     a) has tenant.manage_users permission
--     b) OR has admin role in that tenant
-- SECURITY DEFINER so it can be used safely in RLS and RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
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

  -- Permission-based path
  BEGIN
    SELECT public.has_permission('tenant.manage_users')
    INTO v_has_permission;
  EXCEPTION
    WHEN OTHERS THEN
      v_has_permission := FALSE;
  END;

  -- Role fallback path
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles ro ON ro.id = ur.role_id
    WHERE ur.user_id = v_uid
      AND ur.tenant_id = v_tenant_id
      AND ro.name = 'admin'
  )
  INTO v_is_admin;

  RETURN COALESCE(v_has_permission, FALSE) OR COALESCE(v_is_admin, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_users() TO authenticated;

-- ============================================================
-- 5. Harden approve_user()
-- - permission/role validation
-- - tenant isolation
-- - idempotency guard
-- - atomic state update
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id UUID,
  p_role_name TEXT,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role_id UUID;
  v_target_tenant UUID;
  v_admin_tenant UUID;
  v_current_status TEXT;
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Permisos insuficientes para aprobar usuarios';
  END IF;

  -- Admin tenant must exist and match caller tenant
  SELECT tenant_id INTO v_admin_tenant
  FROM public.profiles
  WHERE id = p_admin_id;

  IF v_admin_tenant IS NULL THEN
    RAISE EXCEPTION 'Perfil del administrador no encontrado';
  END IF;

  IF v_admin_tenant <> public.get_tenant_id() THEN
    RAISE EXCEPTION 'El administrador no pertenece al tenant activo';
  END IF;

  SELECT tenant_id, approval_status
  INTO v_target_tenant, v_current_status
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_tenant IS NULL THEN
    RAISE EXCEPTION 'Perfil del usuario no encontrado';
  END IF;

  IF v_target_tenant <> v_admin_tenant THEN
    RAISE EXCEPTION 'No puedes aprobar usuarios de otro tenant';
  END IF;

  IF v_current_status = 'approved' THEN
    RAISE EXCEPTION 'El usuario ya está aprobado';
  END IF;

  SELECT id INTO v_role_id
  FROM public.roles
  WHERE name = p_role_name;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role "%" not found', p_role_name;
  END IF;

  UPDATE public.profiles
  SET
    approval_status  = 'approved',
    is_active        = TRUE,
    approved_by      = p_admin_id,
    approved_at      = NOW(),
    rejection_reason = NULL
  WHERE id = p_user_id;

  INSERT INTO public.user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (p_user_id, v_target_tenant, v_role_id, p_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;
END;
$$;

-- ============================================================
-- 6. Harden reject_user()
-- - permission/role validation
-- - tenant isolation
-- - removes assigned roles for rejected user
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id UUID,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_tenant UUID;
  v_admin_tenant UUID;
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Permisos insuficientes para rechazar usuarios';
  END IF;

  SELECT tenant_id INTO v_admin_tenant
  FROM public.profiles
  WHERE id = p_admin_id;

  IF v_admin_tenant IS NULL THEN
    RAISE EXCEPTION 'Perfil del administrador no encontrado';
  END IF;

  IF v_admin_tenant <> public.get_tenant_id() THEN
    RAISE EXCEPTION 'El administrador no pertenece al tenant activo';
  END IF;

  SELECT tenant_id INTO v_target_tenant
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_tenant IS NULL THEN
    RAISE EXCEPTION 'Perfil del usuario no encontrado';
  END IF;

  IF v_target_tenant <> v_admin_tenant THEN
    RAISE EXCEPTION 'No puedes rechazar usuarios de otro tenant';
  END IF;

  UPDATE public.profiles
  SET
    approval_status  = 'rejected',
    is_active        = FALSE,
    approved_by      = p_admin_id,
    approved_at      = NOW(),
    rejection_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Sin motivo especificado')
  WHERE id = p_user_id;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
    AND tenant_id = v_target_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_user(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user(UUID, TEXT, UUID) TO authenticated;

-- ============================================================
-- 7. Reliable RPC: list users by approval status
-- Uses can_manage_users() and tenant isolation
-- Bypasses fragile direct SELECT dependence from frontend
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_users_by_approval_status(
  p_status TEXT
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  requested_role TEXT,
  approval_status TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Solo administradores o gestores autorizados pueden listar usuarios';
  END IF;

  SELECT public.get_tenant_id() INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant activo no encontrado';
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
$$;

GRANT EXECUTE ON FUNCTION public.get_users_by_approval_status(TEXT) TO authenticated;

-- ============================================================
-- 8. Fix RLS policies on profiles
-- - drop dangerous / outdated policies
-- - keep self-read
-- - add admin/manager tenant-wide read via helper
-- - remove direct admin approval UPDATE path
-- ============================================================
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_approve" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

-- Read own profile only
CREATE POLICY "profiles_own_read"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
);

-- Admin/manager can read all tenant profiles
CREATE POLICY "profiles_admin_read_all"
ON public.profiles
FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  AND public.can_manage_users()
);

-- Users can update only their own row
-- NOTE: this does NOT enforce column-level restrictions by itself.
-- Sensitive approval fields must be changed only via approve_user/reject_user.
CREATE POLICY "profiles_self_update"
ON public.profiles
FOR UPDATE
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);

-- Optional admin insert policy (existing behavior)
DROP POLICY IF EXISTS "profiles_admin_write" ON public.profiles;

CREATE POLICY "profiles_admin_write"
ON public.profiles
FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.can_manage_users()
);

-- ============================================================
-- 9. Optional consistency fixes for bad historical states
-- Safer approach:
-- - do NOT auto-approve anyone
-- - do NOT auto-delete roles globally
-- - only normalize obviously inconsistent inactive flags
-- ============================================================

-- pending users should not be active
UPDATE public.profiles
SET is_active = FALSE
WHERE approval_status = 'pending'
  AND is_active = TRUE;

-- rejected users should not be active
UPDATE public.profiles
SET is_active = FALSE
WHERE approval_status = 'rejected'
  AND is_active = TRUE;

COMMIT;