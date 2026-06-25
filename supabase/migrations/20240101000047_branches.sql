-- ============================================================
-- Migration 000047: branches (sucursales)
--
-- Adds:
--   - public.branches table (tenants can have multiple locations)
--   - branch_id on public.profiles (which location each user belongs to)
--   - RLS: admin full CRUD, authenticated read, anon read (for registration)
--   - Updates handle_new_user to persist branch_id from signup metadata
-- ============================================================

-- ── 1. Create branches table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  address    TEXT,
  phone      TEXT,
  email      TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. updated_at trigger ──────────────────────────────────────
DROP TRIGGER IF EXISTS branches_updated_at ON public.branches;
CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Enable RLS ──────────────────────────────────────────────
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- ── 4. Admin: full CRUD within their tenant ────────────────────
DROP POLICY IF EXISTS "branches_admin_all" ON public.branches;
CREATE POLICY "branches_admin_all" ON public.branches
  FOR ALL
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
  )
  WITH CHECK (
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

-- ── 5. Authenticated users: read branches in their tenant ──────
DROP POLICY IF EXISTS "branches_auth_read" ON public.branches;
CREATE POLICY "branches_auth_read" ON public.branches
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());

-- ── 6. Anon: read active branches (registration branch selector) ─
DROP POLICY IF EXISTS "branches_anon_read" ON public.branches;
CREATE POLICY "branches_anon_read" ON public.branches
  FOR SELECT TO anon
  USING (is_active = TRUE);

-- ── 7. Add branch_id to profiles ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- ── 8. Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_branches_tenant  ON public.branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_active  ON public.branches(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_branch  ON public.profiles(branch_id);

-- ── 9. Update handle_new_user to persist branch_id ────────────
-- Reads branch_id from signup metadata so new registrations are
-- automatically linked to the branch the user selected.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    tenant_id,
    branch_id,
    full_name,
    approval_status,
    requested_role,
    is_active
  )
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'tenant_id')::UUID,
    NULLIF(NEW.raw_user_meta_data->>'branch_id', '')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending',
    COALESCE(NEW.raw_user_meta_data->>'requested_role', 'client'),
    FALSE
  );
  RETURN NEW;
END;
$$;

-- ── 10. Security hardening for new function ────────────────────
ALTER FUNCTION public.handle_new_user() SET search_path = public;
