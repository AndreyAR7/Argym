-- Ensure arojas@ologistics.com has an approved admin profile.
-- This fixes users created before the handle_new_user trigger was
-- correctly configured (profile row was never created by the trigger).

DO $$
DECLARE
  v_user_id        UUID;
  v_full_name      TEXT;
  v_tenant_id      UUID;
  v_role_id        UUID;
BEGIN
  -- Look up auth user
  SELECT id, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  INTO v_user_id, v_full_name
  FROM auth.users
  WHERE email = 'arojas@ologistics.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User arojas@ologistics.com not found — skipping';
    RETURN;
  END IF;

  -- Get the active tenant
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No active tenant found';
  END IF;

  -- Create or fix the profile
  INSERT INTO public.profiles (
    id, tenant_id, full_name, locale, theme, is_active, approval_status, requested_role
  ) VALUES (
    v_user_id, v_tenant_id, v_full_name, 'es-CR', 'dark', true, 'approved', 'admin'
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id       = EXCLUDED.tenant_id,
    approval_status = 'approved',
    is_active       = true;

  -- Get the admin role id
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'admin';
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role "admin" not found — run RBAC migrations first';
  END IF;

  -- Assign admin role (idempotent)
  INSERT INTO public.user_roles (user_id, tenant_id, role_id, assigned_by)
  VALUES (v_user_id, v_tenant_id, v_role_id, v_user_id)
  ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;

  RAISE NOTICE 'Admin profile ensured for user % (tenant %)', v_user_id, v_tenant_id;
END;
$$;
