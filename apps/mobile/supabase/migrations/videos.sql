-- ─────────────────────────────────────────────────────────────
-- VIDEO MODULE — Supabase Migration
-- Run this in the Supabase SQL editor
-- ─────────────────────────────────────────────────────────────

-- 1. STORAGE BUCKETS
-- Create via Supabase Dashboard > Storage, or use the API:
--   bucket: "videos"       (private, max 2GB per file)
--   bucket: "thumbnails"   (public)
-- Path convention:
--   videos/{tenant_id}/{video_id}/original.mp4
--   thumbnails/{tenant_id}/{video_id}/thumb.jpg

-- 2. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE video_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE video_plan AS ENUM ('basic', 'medium', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. VIDEOS TABLE
CREATE TABLE IF NOT EXISTS videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'General',
  level           video_level NOT NULL DEFAULT 'beginner',
  video_url       TEXT,                          -- Supabase Storage path or external URL
  thumbnail_url   TEXT,                          -- Supabase Storage path or external URL
  thumbnail_color TEXT NOT NULL DEFAULT '#6C63FF', -- fallback color
  duration_seconds INTEGER,                      -- video length in seconds
  allowed_plans   video_plan[] NOT NULL DEFAULT '{}', -- empty = all plans
  allowed_levels  video_level[] NOT NULL DEFAULT '{}', -- empty = all levels
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  views_count     INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. VIDEO ASSIGNMENTS (direct client assignment)
CREATE TABLE IF NOT EXISTS video_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT,
  UNIQUE(video_id, client_id)
);

-- 5. VIDEO PROGRESS (watch history per client)
CREATE TABLE IF NOT EXISTS video_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id         UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  watched_seconds  INTEGER NOT NULL DEFAULT 0,
  completed        BOOLEAN NOT NULL DEFAULT false,
  last_watched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_id, client_id)
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_videos_tenant      ON videos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_videos_active      ON videos(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_videos_featured    ON videos(tenant_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_video_assign_client ON video_assignments(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_client ON video_progress(client_id, tenant_id);

-- 7. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS videos_updated_at ON videos;
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. ROW LEVEL SECURITY
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on their tenant's videos
CREATE POLICY "admin_all_videos" ON videos
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Clients can read active videos from their tenant
CREATE POLICY "client_read_videos" ON videos
  FOR SELECT USING (
    is_active = true AND
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Clients can read their own assignments
CREATE POLICY "client_read_assignments" ON video_assignments
  FOR SELECT USING (client_id = auth.uid());

-- Admins can manage assignments for their tenant
CREATE POLICY "admin_manage_assignments" ON video_assignments
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Clients can manage their own progress
CREATE POLICY "client_manage_progress" ON video_progress
  FOR ALL USING (client_id = auth.uid());

-- 9. INCREMENT VIEWS FUNCTION (called from client, avoids direct update)
CREATE OR REPLACE FUNCTION increment_video_views(p_video_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos SET views_count = views_count + 1 WHERE id = p_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
