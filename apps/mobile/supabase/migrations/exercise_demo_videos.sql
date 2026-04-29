-- ═══════════════════════════════════════════════════════════════
-- EXERCISE DEMO VIDEOS — Add demo video columns to exercises
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS demo_video_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS demo_video_bucket       TEXT DEFAULT 'exercise-demos',
  ADD COLUMN IF NOT EXISTS demo_video_mime_type    TEXT,
  ADD COLUMN IF NOT EXISTS demo_duration_seconds   INTEGER;

-- ── Storage bucket (private) ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-demos',
  'exercise-demos',
  false,
  524288000,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS: staff uploads/manages ───────────────────────────────────
CREATE POLICY "staff_manage_exercise_demos" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'exercise-demos'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
    AND is_staff_in_tenant(my_tenant_id())
  )
  WITH CHECK (
    bucket_id = 'exercise-demos'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
    AND is_staff_in_tenant(my_tenant_id())
  );

-- ── RLS: authenticated clients can read (signed URL playback) ────
CREATE POLICY "clients_read_exercise_demos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'exercise-demos'
    AND (storage.foldername(name))[1] = my_tenant_id()::text
  );
