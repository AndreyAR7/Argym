-- videos/video-thumbnails/exercise-demos WRITE policies (insert/update/delete)
-- only checked has_permission('routines.create') — no tenant scoping at
-- all, unlike their SELECT counterparts which already require
-- storage.foldername(name)[1] = get_tenant_id(). In practice the app
-- always uploads under the caller's own tenant folder, so this wasn't
-- exploitable through the normal UI, but a direct API call referencing
-- another tenant's known/guessed path could write or delete its files.
-- Add the same tenant-folder check the read policies already use.

DROP POLICY IF EXISTS "videos_staff_insert" ON storage.objects;
DROP POLICY IF EXISTS "videos_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "videos_staff_delete" ON storage.objects;

CREATE POLICY "videos_staff_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos'
    AND has_permission('routines.create')
    AND (storage.foldername(name))[1] = get_tenant_id()::text
  );

CREATE POLICY "videos_staff_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'videos'
    AND has_permission('routines.create')
    AND (storage.foldername(name))[1] = get_tenant_id()::text
  );

CREATE POLICY "videos_staff_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'videos'
    AND has_permission('routines.create')
    AND (storage.foldername(name))[1] = get_tenant_id()::text
  );

DROP POLICY IF EXISTS "thumbnails_staff_insert" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_staff_delete" ON storage.objects;

CREATE POLICY "thumbnails_staff_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'video-thumbnails'
    AND has_permission('routines.create')
    AND (storage.foldername(name))[1] = get_tenant_id()::text
  );

CREATE POLICY "thumbnails_staff_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'video-thumbnails'
    AND has_permission('routines.create')
    AND (storage.foldername(name))[1] = get_tenant_id()::text
  );

CREATE POLICY "thumbnails_staff_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'video-thumbnails'
    AND has_permission('routines.create')
    AND (storage.foldername(name))[1] = get_tenant_id()::text
  );

DROP POLICY IF EXISTS "demos_staff_write" ON storage.objects;

CREATE POLICY "demos_staff_write" ON storage.objects
  FOR ALL USING (
    bucket_id = 'exercise-demos'
    AND has_permission('routines.create')
    AND (storage.foldername(name))[1] = get_tenant_id()::text
  );
