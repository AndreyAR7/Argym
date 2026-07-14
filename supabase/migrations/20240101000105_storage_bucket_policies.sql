-- ============================================================
-- Migration 000105: Storage bucket RLS policies
--
-- Buckets must already exist (created via API/dashboard):
--   avatars         - public
--   videos          - public
--   video-thumbnails - public
--   exercise-demos  - private
-- ============================================================

-- ── avatars ──────────────────────────────────────────────────
-- Public bucket: anyone can read; users manage their own folder

DROP POLICY IF EXISTS "avatars_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_insert"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_update"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_user_delete"   ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_user_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_user_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_user_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── videos ───────────────────────────────────────────────────
-- Public bucket: anyone can read; staff (admin/coach) can write

DROP POLICY IF EXISTS "videos_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "videos_staff_insert"   ON storage.objects;
DROP POLICY IF EXISTS "videos_staff_update"   ON storage.objects;
DROP POLICY IF EXISTS "videos_staff_delete"   ON storage.objects;

CREATE POLICY "videos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "videos_staff_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos'
    AND public.has_permission('routines.create')
  );

CREATE POLICY "videos_staff_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'videos'
    AND public.has_permission('routines.create')
  );

CREATE POLICY "videos_staff_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos'
    AND public.has_permission('routines.create')
  );

-- ── video-thumbnails ─────────────────────────────────────────
-- Public bucket: anyone can read; staff can write

DROP POLICY IF EXISTS "thumbnails_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_staff_insert" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_staff_delete" ON storage.objects;

CREATE POLICY "thumbnails_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'video-thumbnails');

CREATE POLICY "thumbnails_staff_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'video-thumbnails'
    AND public.has_permission('routines.create')
  );

CREATE POLICY "thumbnails_staff_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'video-thumbnails'
    AND public.has_permission('routines.create')
  );

CREATE POLICY "thumbnails_staff_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'video-thumbnails'
    AND public.has_permission('routines.create')
  );

-- ── exercise-demos ────────────────────────────────────────────
-- Private bucket: authenticated users read; staff write

DROP POLICY IF EXISTS "demos_auth_read"    ON storage.objects;
DROP POLICY IF EXISTS "demos_staff_write"  ON storage.objects;

CREATE POLICY "demos_auth_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exercise-demos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "demos_staff_write" ON storage.objects
  FOR ALL USING (
    bucket_id = 'exercise-demos'
    AND public.has_permission('routines.create')
  );
