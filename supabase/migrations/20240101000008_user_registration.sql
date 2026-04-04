-- ============================================================
-- User Registration with Admin Approval Flow
-- ============================================================

-- Add approval status to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add registration metadata
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_role TEXT DEFAULT NULL;  -- role the user requested
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) DEFAULT NULL;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

-- Index for admin to quickly find pending users
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status
  ON public.profiles(tenant_id, approval_status);

-- ============================================================
-- RLS: pending users can read their own profile but nothing else
-- ============================================================

-- Allow pending users to read their own profile (to check approval status)
CREATE POLICY "profiles_own_read" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Admin can update approval_status, approved_by, approved_at, rejection_reason
CREATE POLICY "profiles_admin_approve" ON public.profiles
  FOR UPDATE USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('tenant.manage_users')
  );

-- ============================================================
-- Function: auto-create profile on signup via Supabase Auth trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_requested_role TEXT;
BEGIN
  -- Extract tenant_id and requested_role from user metadata if provided
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  v_requested_role := NEW.raw_user_meta_data->>'requested_role';

  -- Only create profile if tenant_id was provided during signup
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      tenant_id,
      full_name,
      locale,
      theme,
      is_active,
      approval_status,
      requested_role
    ) VALUES (
      NEW.id,
      v_tenant_id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'es-CR',
      'dark',
      FALSE,  -- not active until approved
      'pending',
      COALESCE(v_requested_role, 'client')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Function: approve user (called by admin)
-- Sets is_active=true, creates user_role entry
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_user(
  p_user_id UUID,
  p_role_name TEXT,
  p_admin_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_role_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from the user being approved
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_user_id;

  -- Get role_id
  SELECT id INTO v_role_id FROM public.roles WHERE name = p_role_name;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role % not found', p_role_name;
  END IF;

  -- Update profile: approve and activate
  UPDATE public.profiles SET
    approval_status = 'approved',
    is_active = TRUE,
    approved_by = p_admin_id,
    approved_at = NOW()
  WHERE id = p_user_id;

  -- Assign role
  INSERT INTO public.user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (p_user_id, v_tenant_id, v_role_id, p_admin_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: reject user
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id UUID,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles SET
    approval_status = 'rejected',
    is_active = FALSE,
    approved_by = p_admin_id,
    approved_at = NOW(),
    rejection_reason = p_reason
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
