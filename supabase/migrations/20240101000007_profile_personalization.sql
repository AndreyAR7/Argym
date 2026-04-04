-- ============================================================
-- Profile Personalization: expand theme enum + avatar storage
-- ============================================================

-- Expand theme options (profiles.theme is currently TEXT, so no enum change needed)
-- Just document the supported values:
-- system | light | dark | midnight | violet | emerald

-- Ensure avatar_url column exists (it should from migration 003, but guard it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Ensure theme column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark';
  END IF;
END $$;

-- ============================================================
-- Storage bucket: avatars
-- Run this in Supabase Dashboard > Storage > New Bucket
-- OR via the Supabase CLI / API. SQL alone cannot create buckets.
-- Bucket name: avatars
-- Public: false (use signed URLs)
-- ============================================================

-- ============================================================
-- Storage RLS policies for avatars bucket
-- These must be applied via Supabase Dashboard > Storage > Policies
-- OR via the management API. Shown here as reference:
--
-- Policy: "Users can upload their own avatar"
--   Bucket: avatars
--   Operation: INSERT
--   Expression: (storage.foldername(name))[1] = auth.uid()::text
--
-- Policy: "Users can update their own avatar"
--   Bucket: avatars
--   Operation: UPDATE
--   Expression: (storage.foldername(name))[1] = auth.uid()::text
--
-- Policy: "Users can delete their own avatar"
--   Bucket: avatars
--   Operation: DELETE
--   Expression: (storage.foldername(name))[1] = auth.uid()::text
--
-- Policy: "Authenticated users can read any avatar"
--   Bucket: avatars
--   Operation: SELECT
--   Expression: auth.role() = 'authenticated'
-- ============================================================

-- RLS: allow users to update their own profile (avatar_url, theme, full_name, phone)
-- This policy should already exist from migration 004, but ensure it covers UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_self_update'
  ) THEN
    CREATE POLICY "profiles_self_update" ON public.profiles
      FOR UPDATE USING (id = auth.uid());
  END IF;
END $$;
