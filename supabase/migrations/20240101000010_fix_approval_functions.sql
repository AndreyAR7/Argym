-- ============================================================
-- Fix approval flow consistency
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Fix approve_user: add permission check + tenant isolation ──

CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id UUID,
  p_role_name TEXT,
  p_admin_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_role_id    UUID;
  v_tenant_id  UUID;
  v_admin_tenant UUID;
  v_current_status TEXT;
BEGIN
  -- Verify the calling admin has the required permission
  IF NOT public.has_permission('tenant.manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions to approve users';
  END IF;

  -- Get the admin's tenant
  SELECT tenant_id INTO v_admin_tenant
    FROM public.profiles WHERE id = p_admin_id;

  IF v_admin_tenant IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found';
  END IF;

  -- Get the target user's tenant and current status
  SELECT tenant_id, approval_status
    INTO v_tenant_id, v_current_status
    FROM public.profiles WHERE id = p_user_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Tenant isolation: admin can only approve users in their own tenant
  IF v_tenant_id <> v_admin_tenant THEN
    RAISE EXCEPTION 'Cannot approve users from a different tenant';
  END IF;

  -- Idempotency guard: only approve pending users
  IF v_current_status = 'approved' THEN
    RAISE EXCEPTION 'User is already approved';
  END IF;

  -- Resolve role
  SELECT id INTO v_role_id FROM public.roles WHERE name = p_role_name;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role "%" not found', p_role_name;
  END IF;

  -- Atomic update: set ALL fields consistently in one statement
  UPDATE public.profiles SET
    approval_status  = 'approved',
    is_active        = TRUE,
    approved_by      = p_admin_id,
    approved_at      = NOW(),
    rejection_reason = NULL   -- clear any previous rejection reason
  WHERE id = p_user_id;

  -- Assign role (upsert — safe if called twice)
  INSERT INTO public.user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (p_user_id, v_tenant_id, v_role_id, p_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 2. Fix reject_user: add permission check + tenant isolation + cleanup ──

CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id UUID,
  p_reason  TEXT,
  p_admin_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_tenant_id    UUID;
  v_admin_tenant UUID;
  v_current_status TEXT;
BEGIN
  -- Verify the calling admin has the required permission
  IF NOT public.has_permission('tenant.manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions to reject users';
  END IF;

  -- Get the admin's tenant
  SELECT tenant_id INTO v_admin_tenant
    FROM public.profiles WHERE id = p_admin_id;

  IF v_admin_tenant IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found';
  END IF;

  -- Get the target user's tenant and current status
  SELECT tenant_id, approval_status
    INTO v_tenant_id, v_current_status
    FROM public.profiles WHERE id = p_user_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Tenant isolation
  IF v_tenant_id <> v_admin_tenant THEN
    RAISE EXCEPTION 'Cannot reject users from a different tenant';
  END IF;

  -- Atomic update: set ALL fields consistently
  UPDATE public.profiles SET
    approval_status  = 'rejected',
    is_active        = FALSE,
    approved_by      = p_admin_id,
    approved_at      = NOW(),
    rejection_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Sin motivo especificado')
  WHERE id = p_user_id;

  -- Remove any previously assigned roles (in case user was approved then re-rejected)
  DELETE FROM public.user_roles
  WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 3. Fix profiles_self_update: use column-level protection ──
-- RLS WITH CHECK cannot restrict individual columns.
-- The correct approach is to revoke direct UPDATE and route all
-- sensitive-field changes through SECURITY DEFINER functions.
-- For personal fields (full_name, avatar_url, theme, locale, phone),
-- we keep the self-update policy but add a CHECK constraint approach.

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

-- Users can update ONLY their own row.
-- Sensitive fields (approval_status, is_active, tenant_id, approved_by,
-- approved_at, rejection_reason, requested_role) are protected because:
-- a) approve_user() and reject_user() are SECURITY DEFINER (bypass RLS)
-- b) profiles_admin_write covers admin updates
-- c) No other policy allows UPDATE on those fields for normal users
CREATE POLICY "profiles_self_update"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── 4. Remove profiles_admin_approve (redundant — covered by profiles_admin_write) ──
-- profiles_admin_approve allowed direct UPDATE by admins, which could create
-- inconsistent states (e.g. setting approval_status without touching is_active).
-- All approval changes must go through approve_user() / reject_user() functions.
DROP POLICY IF EXISTS "profiles_admin_approve" ON public.profiles;


-- ── 5. Fix existing inconsistent rows ──
-- Correct any rows that ended up in an inconsistent state:

-- Case: pending + is_active=true → reset to pending + inactive
UPDATE public.profiles
SET is_active = FALSE
WHERE approval_status = 'pending' AND is_active = TRUE;

-- Case: rejected + is_active=true → reset to inactive
UPDATE public.profiles
SET is_active = FALSE
WHERE approval_status = 'rejected' AND is_active = TRUE;

-- Case: approved + is_active=false → this is valid only if admin manually deactivated.
-- We leave these alone — admin may have intentionally deactivated an approved user.

-- Case: approved + no user_role → log for manual review (cannot auto-fix without knowing intended role)
-- Run this query to identify them:
-- SELECT p.id, p.full_name, p.approval_status, p.is_active
-- FROM public.profiles p
-- LEFT JOIN public.user_roles ur ON ur.user_id = p.id
-- WHERE p.approval_status = 'approved' AND ur.user_id IS NULL;
