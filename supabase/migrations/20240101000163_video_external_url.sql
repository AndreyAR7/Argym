-- Allow a video's content to live at an external URL (YouTube, Vimeo, etc.)
-- instead of a file uploaded to Supabase Storage. When set, playback
-- redirects to this URL instead of fetching a signed Storage URL — access
-- control (allowed_levels, allowed_plans, plan_videos, is_free, RLS) is
-- unaffected, it only changes how the video is played.
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS external_url TEXT NULL;
