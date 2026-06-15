-- ============================================================
-- Videos module: categories, videos, assignments, progress, views
-- Migration order: must run before 0033 (plan_videos / promotion_videos)
--                  and before 0034 (which adds is_free column)
-- ============================================================

-- ── video_categories ─────────────────────────────────────────
CREATE TABLE public.video_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug        TEXT        NOT NULL,
  label       TEXT        NOT NULL,
  icon        TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_video_categories_global_slug
  ON public.video_categories(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX idx_video_categories_tenant_slug
  ON public.video_categories(slug, tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_video_categories_tenant
  ON public.video_categories(tenant_id);

ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;

-- Global (tenant_id IS NULL) or same-tenant categories are readable
CREATE POLICY "video_categories_tenant_read" ON public.video_categories
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id = public.get_tenant_id()
  );

-- Admin/coach can write (both have routines.create permission)
CREATE POLICY "video_categories_staff_write" ON public.video_categories
  FOR ALL USING (public.has_permission('routines.create'));

-- Default global categories (no tenant scope)
INSERT INTO public.video_categories (slug, label, icon, sort_order) VALUES
  ('general',     'General',      '🎬', 0),
  ('strength',    'Fuerza',       '💪', 1),
  ('cardio',      'Cardio',       '🏃', 2),
  ('flexibility', 'Flexibilidad', '🧘', 3),
  ('nutrition',   'Nutrición',    '🥗', 4),
  ('motivation',  'Motivación',   '🔥', 5);

-- ── videos ────────────────────────────────────────────────────
CREATE TABLE public.videos (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title                  TEXT        NOT NULL,
  description            TEXT,
  category_id            UUID        REFERENCES public.video_categories(id) ON DELETE SET NULL,
  level                  TEXT        NOT NULL DEFAULT 'beginner',
  video_bucket           TEXT        NOT NULL DEFAULT 'videos',
  video_storage_path     TEXT,
  video_mime_type        TEXT,
  video_file_size_bytes  BIGINT,
  thumbnail_bucket       TEXT        NOT NULL DEFAULT 'video-thumbnails',
  thumbnail_storage_path TEXT,
  thumbnail_color        TEXT        NOT NULL DEFAULT '#6C63FF',
  duration_seconds       INT,
  allowed_plans          TEXT[]      NOT NULL DEFAULT '{}',
  allowed_levels         TEXT[]      NOT NULL DEFAULT '{}',
  status                 TEXT        NOT NULL DEFAULT 'draft',
  is_featured            BOOLEAN     NOT NULL DEFAULT FALSE,
  is_free                BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order             INT         NOT NULL DEFAULT 0,
  views_count            INT         NOT NULL DEFAULT 0,
  created_by             UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by             UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT videos_status_check CHECK (
    status IN ('draft','uploading','processing','published','archived','failed')
  ),
  CONSTRAINT videos_level_check CHECK (
    level IN ('beginner','intermediate','advanced')
  )
);

CREATE INDEX idx_videos_tenant        ON public.videos(tenant_id);
CREATE INDEX idx_videos_tenant_status ON public.videos(tenant_id, status);
CREATE INDEX idx_videos_sort          ON public.videos(tenant_id, sort_order ASC, created_at DESC);
CREATE INDEX idx_videos_featured      ON public.videos(tenant_id) WHERE is_featured = TRUE;
CREATE INDEX idx_videos_levels        ON public.videos USING GIN (allowed_levels);
CREATE INDEX idx_videos_plans         ON public.videos USING GIN (allowed_plans);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- All tenant members can read their tenant's videos
CREATE POLICY "videos_tenant_read" ON public.videos
  FOR SELECT USING (tenant_id = public.get_tenant_id());

-- Admin/coach can create, edit, delete
CREATE POLICY "videos_staff_write" ON public.videos
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('routines.create')
  );

-- ── video_assignments ─────────────────────────────────────────
-- Direct video-to-client assignments (one row per video+client pair)
CREATE TABLE public.video_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    UUID        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note        TEXT,
  UNIQUE (video_id, client_id)
);

CREATE INDEX idx_video_assignments_client ON public.video_assignments(client_id, tenant_id);
CREATE INDEX idx_video_assignments_video  ON public.video_assignments(video_id);
CREATE INDEX idx_video_assignments_tenant ON public.video_assignments(tenant_id);

ALTER TABLE public.video_assignments ENABLE ROW LEVEL SECURITY;

-- Client can read their own assignments; staff can read all tenant assignments
CREATE POLICY "video_assignments_read" ON public.video_assignments
  FOR SELECT USING (
    client_id = auth.uid()
    OR (tenant_id = public.get_tenant_id() AND public.has_permission('routines.create'))
  );

-- Admin/coach can insert/update/delete assignments
CREATE POLICY "video_assignments_staff_write" ON public.video_assignments
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('routines.create')
  );

-- ── video_progress ────────────────────────────────────────────
-- Per-client watch progress for each video
CREATE TABLE public.video_progress (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id        UUID        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  client_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  watched_seconds INT         NOT NULL DEFAULT 0,
  completed       BOOLEAN     NOT NULL DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (video_id, client_id)
);

CREATE INDEX idx_video_progress_client ON public.video_progress(client_id, tenant_id);
CREATE INDEX idx_video_progress_video  ON public.video_progress(video_id);

ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

-- Client can read/write their own progress; staff can read all
CREATE POLICY "video_progress_client_rw" ON public.video_progress
  FOR ALL USING (
    client_id = auth.uid()
    OR (tenant_id = public.get_tenant_id() AND public.has_permission('routines.create'))
  );

-- ── video_views ───────────────────────────────────────────────
-- Append-only view event log (one row per viewing session)
CREATE TABLE public.video_views (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id        UUID        NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  client_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  viewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_seconds INT
);

CREATE INDEX idx_video_views_video  ON public.video_views(video_id);
CREATE INDEX idx_video_views_client ON public.video_views(client_id, tenant_id);

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Client can insert their own view events
CREATE POLICY "video_views_client_insert" ON public.video_views
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- Client can read their own history; staff can read all
CREATE POLICY "video_views_read" ON public.video_views
  FOR SELECT USING (
    client_id = auth.uid()
    OR (tenant_id = public.get_tenant_id() AND public.has_permission('routines.create'))
  );

-- ── record_video_view RPC ─────────────────────────────────────
-- Atomically logs a view event and increments views_count on the video
CREATE OR REPLACE FUNCTION public.record_video_view(
  p_video_id     UUID,
  p_client_id    UUID,
  p_tenant_id    UUID,
  p_session_secs INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.video_views (video_id, client_id, tenant_id, session_seconds)
  VALUES (p_video_id, p_client_id, p_tenant_id, p_session_secs);

  UPDATE public.videos
  SET views_count = views_count + 1,
      updated_at  = NOW()
  WHERE id = p_video_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_video_view(UUID, UUID, UUID, INT) TO authenticated;
