-- ============================================================
-- Migration 000055: Google OAuth profile auto-creation
--
-- Extends handle_new_user() so that users who sign up via Google
-- OAuth (which does not supply tenant_id in raw_user_meta_data)
-- still get a profile row.  The function now:
--   1. Uses tenant_id from metadata when present (email/password flow).
--   2. Falls back to the single active tenant when absent (OAuth flow).
--   3. Reads full_name / avatar_url from either the Supabase metadata
--      field names OR the Google-provided equivalents (name / picture).
-- ============================================================

DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id      UUID;
  v_requested_role TEXT;
  v_full_name      TEXT;
  v_avatar_url     TEXT;
BEGIN
  -- Prefer explicitly supplied tenant_id (email/password registration)
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- For OAuth logins (Google etc.) there is no tenant_id in metadata —
  -- fall back to the single active tenant in this deployment.
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE is_active = TRUE
    ORDER BY created_at
    LIMIT 1;
  END IF;

  v_requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'client');

  -- Google supplies "name" and "picture"; our own signup uses "full_name" and "avatar_url"
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
      id,
      tenant_id,
      full_name,
      avatar_url,
      locale,
      theme,
      is_active,
      approval_status,
      requested_role
    ) VALUES (
      NEW.id,
      v_tenant_id,
      v_full_name,
      v_avatar_url,
      'es-CR',
      'dark',
      FALSE,
      'pending',
      v_requested_role
    )
    -- If the user already has a profile (e.g., linked accounts), leave it untouched
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
