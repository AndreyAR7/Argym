-- ============================================================
-- Migration 000146: Track the remaining storage buckets in git
--
-- 000105's own header comment admits it: "Buckets must already exist
-- (created via API/dashboard)". This is the same infrastructure-outside-git
-- pattern that once caused two real migrations to vanish from the repo
-- entirely (see the incident notes in earlier migrations) — a bucket
-- created by clicking in the dashboard leaves no record anywhere a fresh
-- clone/`supabase db reset` can replay. 000118 (tenant-logos) already
-- established the fix (INSERT INTO storage.buckets ... ON CONFLICT DO
-- NOTHING); this backfills it for the four buckets 000105's policies
-- assume already exist. ON CONFLICT DO NOTHING means this is a no-op
-- against the current production project — it only matters for a fresh
-- environment that doesn't have these buckets yet.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',          'avatars',          true,  5242880,    ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('videos',           'videos',           true,  524288000,  ARRAY['video/mp4', 'video/quicktime', 'video/webm']),
  ('video-thumbnails', 'video-thumbnails', true,  5242880,    ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('exercise-demos',   'exercise-demos',   false, 524288000,  ARRAY['video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO NOTHING;
