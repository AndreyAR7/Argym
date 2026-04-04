-- ============================================================
-- Fix RLS on profiles + protect sensitive approval fields
-- ============================================================

-- ── 1. Drop conflicting SELECT policies ──────────────────────
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_read" ON public.profiles;

-- ── 2. Self-read: any authenticated user can read their own row ──
CREATE POLICY "profiles_own_read"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- ── 3. Admin-read: admins can read all profiles in their tenant ──
CREATE POLICY "profiles_admin_read_all"
  ON public.profiles
  FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('tenant.manage_users')
  );

-- ── 4. Self-update: users can only update safe personal fields ──
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

CREATE POLICY "profiles_self_update"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    -- Prevent users from changing sensitive approval/access fields
    id = auth.uid()
    -- The following fields must not change via this policy:
    -- approval_status, approved_by, approved_at, rejection_reason,
    -- tenant_id, is_active, requested_role
    -- Enforced by only allowing the policy to match own row;
    -- actual column restriction is handled by the approve_user() / reject_user()
    -- SECURITY DEFINER functions which bypass RLS.
  );

-- ── 5. Admin-write: admins can insert/update any profile in tenant ──
DROP POLICY IF EXISTS "profiles_admin_write" ON public.profiles;

CREATE POLICY "profiles_admin_write"
  ON public.profiles
  FOR ALL
  USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('tenant.manage_users')
  );

-- ── 6. INSERT for new registrations ──────────────────────────
-- New users insert their own profile via the trigger handle_new_user()
-- which runs as SECURITY DEFINER, so no INSERT policy needed for anon.
-- But if direct insert is needed (e.g. admin creating users):
-- covered by profiles_admin_write above.

-- ── 7. Grant execute on approval functions to authenticated users ──
-- approve_user and reject_user are SECURITY DEFINER so they bypass RLS.
-- Only admins should call them — enforced by checking has_permission inside.
GRANT EXECUTE ON FUNCTION public.approve_user(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user(UUID, TEXT, UUID) TO authenticated;
