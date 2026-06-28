-- ============================================================
-- Migration 000080: Fix has_permission() broken by migration 000078
--
-- Migration 000078 introduced two bugs in has_permission():
--   1. Used p.name instead of p.code  ← wrong column (CRITICAL — always returns FALSE)
--   2. Removed ur.tenant_id = get_tenant_id() ← removes tenant isolation
--
-- This migration restores the correct logic while keeping the
-- NULL-uid safety improvement from 000078.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id       = auth.uid()
        AND ur.tenant_id     = public.get_tenant_id()
        AND p.code           = permission_code          -- ← correct column
    )
  END
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth;
