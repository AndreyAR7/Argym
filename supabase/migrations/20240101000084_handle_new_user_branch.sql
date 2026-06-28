-- ============================================================
-- Migration 000084: save branch_id from signup metadata +
--                   allow pending users to claim their branch
-- ============================================================

-- 1. Extend handle_new_user() to persist branch_id when present in metadata.
--    (Google OAuth users won't have it — they select it afterwards via
--    the set_own_branch() RPC below.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id      UUID;
  v_requested_role TEXT;
  v_full_name      TEXT;
  v_avatar_url     TEXT;
  v_branch_id      UUID;
BEGIN
  v_tenant_id  := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  v_branch_id  := (NEW.raw_user_meta_data->>'branch_id')::UUID;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE is_active = TRUE
    ORDER BY created_at
    LIMIT 1;
  END IF;

  v_requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'client');

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id, tenant_id, full_name, avatar_url, branch_id,
      locale, theme, is_active, approval_status, requested_role
    ) VALUES (
      NEW.id, v_tenant_id, v_full_name, v_avatar_url, v_branch_id,
      'es-CR', 'dark', FALSE, 'pending', v_requested_role
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: pending users can claim a branch after OAuth sign-in.
--    Uses SECURITY DEFINER so the user doesn't need direct UPDATE access.
CREATE OR REPLACE FUNCTION public.set_own_branch(p_branch_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.branches
  WHERE id = p_branch_id AND is_active = TRUE;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'branch_not_found';
  END IF;

  UPDATE public.profiles
  SET branch_id = p_branch_id,
      tenant_id = v_tenant_id
  WHERE id = auth.uid();
END;
$$;
