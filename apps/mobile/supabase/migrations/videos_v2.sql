-- ═══════════════════════════════════════════════════════════════
-- VIDEO MODULE v2 — Production-grade migration
-- Run AFTER videos.sql (or replace it if starting fresh)
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- STORAGE BUCKETS (run via Supabase Dashboard or Management API)
-- ───────────────────────────────────────────────────────────────
-- bucket: "videos"
--   private: true
--   file_size_limit: 53687091200  -- 50 GB (bytes)
--   allowed_mime_types: ['video/mp4','video/webm','video/quicktime','video/x-msvideo']
--
-- bucket: "video-thumbnails"
--   private: false  (public CDN)
--   file_size_limit: 5242880  -- 5 MB
--   allowed_mime_types: ['image/jpeg','image/png','image/webp']
--
-- Storage path convention:
--   videos/{tenant_id}/{video_id}/original.{ext}
--   video-thumbnails/{tenant_id}/{video_id}/thumb.{ext}
-- ───────────────────────────────────────────────────────────────

-- ── 1. ENUM TYPES ───────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE video_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE video_plan AS ENUM ('basic', 'medium', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lifecycle state — replaces boolean is_active
DO $$ BEGIN
  CREATE TYPE video_status AS ENUM (
    'draft',        -- created, no file yet
    'uploading',    -- file upload in progress
    'processing',   -- post-upload processing (thumbnail gen, transcoding future)
    'published',    -- visible to eligible clients
    'archived',     -- hidden from clients, kept for history
    'failed'        -- upload or processing failed
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. VIDEO CATEGORIES CATALOG ─────────────────────────────────
-- Normalized table instead of free TEXT — prevents inconsistencies
-- and allows future i18n, icons, sort_order per tenant.

CREATE TABLE IF NOT EXISTS video_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = global/default
  slug        TEXT NOT NULL,   -- 'fuerza', 'cardio', etc. — used in code
  label       TEXT NOT NULL,   -- 'Fuerza', 'Cardio' — displayed in UI
  icon        TEXT,            -- emoji or icon name
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tenant_id, slug)
);

-- Seed global default categories (tenant_id = NULL = available to all)
INSERT INTO video_categories (tenant_id, slug, label, icon, sort_order) VALUES
  (NULL, 'fuerza',       'Fuerza',       '💪', 1),
  (NULL, 'cardio',       'Cardio',       '🏃', 2),
  (NULL, 'movilidad',    'Movilidad',    '🧘', 3),
  (NULL, 'nutricion',    'Nutrición',    '🥗', 4),
  (NULL, 'recuperacion', 'Recuperación', '🛌', 5),
  (NULL, 'hiit',         'HIIT',         '🔥', 6),
  (NULL, 'yoga',         'Yoga',         '🌿', 7),
  (NULL, 'general',      'General',      '🎬', 8)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- ── 3. VIDEOS TABLE (v2) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS videos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Content
  title                 TEXT NOT NULL,
  description           TEXT,
  category_id           UUID REFERENCES video_categories(id),  -- FK to catalog
  level                 video_level NOT NULL DEFAULT 'beginner',

  -- Storage — bucket + path stored separately, URL generated on demand
  video_bucket          TEXT NOT NULL DEFAULT 'videos',
  video_storage_path    TEXT,          -- e.g. {tenant_id}/{video_id}/original.mp4
  video_mime_type       TEXT,          -- e.g. video/mp4
  video_file_size_bytes BIGINT,        -- actual file size

  thumbnail_bucket      TEXT NOT NULL DEFAULT 'video-thumbnails',
  thumbnail_storage_path TEXT,         -- e.g. {tenant_id}/{video_id}/thumb.jpg
  thumbnail_color       TEXT NOT NULL DEFAULT '#6C63FF',  -- fallback when no thumbnail

  -- Video metadata
  duration_seconds      INTEGER,       -- populated after upload/processing

  -- Access control
  allowed_plans         video_plan[]  NOT NULL DEFAULT '{}',  -- empty = all plans
  allowed_levels        video_level[] NOT NULL DEFAULT '{}',  -- empty = all levels

  -- Lifecycle
  status                video_status NOT NULL DEFAULT 'draft',
  is_featured           BOOLEAN NOT NULL DEFAULT false,
  sort_order            INTEGER NOT NULL DEFAULT 0,

  -- Analytics (denormalized counter — acceptable for MVP read performance)
  views_count           INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_by            UUID REFERENCES auth.users(id),
  updated_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. VIDEO ASSIGNMENTS ────────────────────────────────────────

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

-- ── 5. VIDEO PROGRESS ───────────────────────────────────────────

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

-- ── 6. VIDEO VIEW EVENTS (analytics — append-only) ──────────────
-- Separate from views_count counter.
-- Allows: unique viewers, watch frequency, time-of-day analytics.
-- Keep lightweight — no heavy joins needed at query time.

CREATE TABLE IF NOT EXISTS video_view_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_seconds INTEGER  -- how long they watched in this session
);

-- ── 7. INDEXES ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_videos_tenant         ON videos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_videos_published      ON videos(tenant_id, status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_videos_featured       ON videos(tenant_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_videos_category       ON videos(category_id);
CREATE INDEX IF NOT EXISTS idx_video_assign_client   ON video_assignments(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_client ON video_progress(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_events_video    ON video_view_events(video_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_events_client   ON video_view_events(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_categories_tenant ON video_categories(tenant_id, is_active);

-- ── 8. TRIGGERS ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS videos_updated_at ON videos;
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 9. ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE videos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_view_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_categories    ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user has admin or coach role in their tenant
CREATE OR REPLACE FUNCTION is_staff_in_tenant(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = p_tenant_id
      AND r.name IN ('admin', 'coach')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's tenant_id
CREATE OR REPLACE FUNCTION my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── videos policies ──────────────────────────────────────────────

-- Staff (admin/coach) can do everything on their tenant's videos
CREATE POLICY "staff_all_videos" ON videos
  FOR ALL
  USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id))
  WITH CHECK (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));

-- Clients can only SELECT published videos from their tenant
CREATE POLICY "client_read_published_videos" ON videos
  FOR SELECT
  USING (
    status = 'published'
    AND tenant_id = my_tenant_id()
    AND NOT is_staff_in_tenant(tenant_id)
  );

-- ── video_assignments policies ───────────────────────────────────

-- Staff can manage all assignments in their tenant
CREATE POLICY "staff_manage_assignments" ON video_assignments
  FOR ALL
  USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id))
  WITH CHECK (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));

-- Clients can only read their own assignments
CREATE POLICY "client_read_own_assignments" ON video_assignments
  FOR SELECT
  USING (client_id = auth.uid() AND tenant_id = my_tenant_id());

-- ── video_progress policies ──────────────────────────────────────

-- Clients manage their own progress
CREATE POLICY "client_own_progress" ON video_progress
  FOR ALL
  USING (client_id = auth.uid() AND tenant_id = my_tenant_id())
  WITH CHECK (client_id = auth.uid() AND tenant_id = my_tenant_id());

-- Staff can read progress for their tenant (for analytics)
CREATE POLICY "staff_read_progress" ON video_progress
  FOR SELECT
  USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));

-- ── video_view_events policies ───────────────────────────────────

-- Clients can insert their own events
CREATE POLICY "client_insert_view_events" ON video_view_events
  FOR INSERT
  WITH CHECK (client_id = auth.uid() AND tenant_id = my_tenant_id());

-- Staff can read all events for their tenant
CREATE POLICY "staff_read_view_events" ON video_view_events
  FOR SELECT
  USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));

-- ── video_categories policies ────────────────────────────────────

-- Everyone in the tenant can read categories (global + their tenant's)
CREATE POLICY "read_categories" ON video_categories
  FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = my_tenant_id());

-- Only staff can manage tenant-specific categories
CREATE POLICY "staff_manage_categories" ON video_categories
  FOR ALL
  USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id))
  WITH CHECK (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));

-- ── 10. FUNCTIONS ────────────────────────────────────────────────

-- Increment views_count + insert view event atomically
CREATE OR REPLACE FUNCTION record_video_view(
  p_video_id      UUID,
  p_client_id     UUID,
  p_tenant_id     UUID,
  p_session_secs  INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Increment denormalized counter
  UPDATE videos SET views_count = views_count + 1 WHERE id = p_video_id;

  -- Append event for analytics
  INSERT INTO video_view_events (video_id, client_id, tenant_id, session_seconds)
  VALUES (p_video_id, p_client_id, p_tenant_id, p_session_secs);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Publish a video (transition: draft/failed → published)
CREATE OR REPLACE FUNCTION publish_video(p_video_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos
  SET status = 'published', updated_by = p_user_id, updated_at = now()
  WHERE id = p_video_id
    AND tenant_id = my_tenant_id()
    AND is_staff_in_tenant(my_tenant_id());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Archive a video
CREATE OR REPLACE FUNCTION archive_video(p_video_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos
  SET status = 'archived', updated_by = p_user_id, updated_at = now()
  WHERE id = p_video_id
    AND tenant_id = my_tenant_id()
    AND is_staff_in_tenant(my_tenant_id());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
