-- ============================================================
-- Plan & Promotion → Video access control
-- Videos assigned to a plan are accessible to all active
-- subscribers of that plan.
-- Videos assigned to a promotion are accessible to subscribers
-- whose subscription used that promotion.
-- ============================================================

-- ── plan_videos ───────────────────────────────────────────────
CREATE TABLE public.plan_videos (
  plan_id    UUID NOT NULL REFERENCES public.plans(id)  ON DELETE CASCADE,
  video_id   UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plan_id, video_id)
);

CREATE INDEX idx_plan_videos_plan  ON public.plan_videos(plan_id);
CREATE INDEX idx_plan_videos_video ON public.plan_videos(video_id);

ALTER TABLE public.plan_videos ENABLE ROW LEVEL SECURITY;

-- Any authenticated tenant member can read (needed for access resolution)
CREATE POLICY "plan_videos_tenant_read" ON public.plan_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = plan_videos.plan_id
        AND p.tenant_id = public.get_tenant_id()
    )
  );

CREATE POLICY "plan_videos_admin_write" ON public.plan_videos
  FOR ALL USING (public.has_permission('billing.manage'));

-- ── promotion_videos ──────────────────────────────────────────
CREATE TABLE public.promotion_videos (
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  video_id     UUID NOT NULL REFERENCES public.videos(id)     ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (promotion_id, video_id)
);

CREATE INDEX idx_promotion_videos_promo ON public.promotion_videos(promotion_id);
CREATE INDEX idx_promotion_videos_video ON public.promotion_videos(video_id);

ALTER TABLE public.promotion_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotion_videos_tenant_read" ON public.promotion_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.promotions p
      WHERE p.id = promotion_videos.promotion_id
        AND p.tenant_id = public.get_tenant_id()
    )
  );

CREATE POLICY "promotion_videos_admin_write" ON public.promotion_videos
  FOR ALL USING (public.has_permission('billing.manage'));
