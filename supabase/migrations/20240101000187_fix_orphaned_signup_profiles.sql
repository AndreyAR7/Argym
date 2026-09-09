-- handle_new_user() silently skips the profiles INSERT when no active
-- tenant can be resolved (no tenant_id in signup metadata — always true
-- for Google OAuth — and no active tenant existed yet, e.g. before the
-- platform's first gym was created). This orphaned several real Google
-- sign-ups (auth.users row with no matching profiles row), which then
-- hit a second, misleading bug: set_own_branch()'s "profile exists with
-- branch_id IS NULL" check also fails when there's no profile row at
-- all, raising 'branch_already_set' — the wrong error for "you were
-- never given a profile in the first place".
--
-- Fix: log the skip instead of silently swallowing it, and make
-- set_own_branch() self-heal by creating the missing profile at branch-
-- selection time (using the tenant resolved from the branch itself, so
-- there's no more ambiguity about which tenant to assign).

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
  ELSE
    RAISE WARNING 'handle_new_user: no active tenant resolved, skipped profile creation for user % (%)', NEW.id, NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_own_branch(p_branch_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id  UUID;
  v_full_name  TEXT;
  v_avatar_url TEXT;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.branches
  WHERE id = p_branch_id AND is_active = TRUE;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'branch_not_found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    SELECT
      COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
      COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')
    INTO v_full_name, v_avatar_url
    FROM auth.users WHERE id = auth.uid();

    INSERT INTO public.profiles (
      id, tenant_id, full_name, avatar_url, branch_id,
      locale, theme, is_active, approval_status, requested_role
    ) VALUES (
      auth.uid(), v_tenant_id, v_full_name, v_avatar_url, p_branch_id,
      'es-CR', 'dark', FALSE, 'pending', 'client'
    );
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND branch_id IS NOT NULL) THEN
    RAISE EXCEPTION 'branch_already_set';
  END IF;

  PERFORM set_config('app.bypass_approval_trigger', 'true', true);
  UPDATE public.profiles
  SET branch_id = p_branch_id,
      tenant_id = v_tenant_id
  WHERE id = auth.uid();
END;
$$;
