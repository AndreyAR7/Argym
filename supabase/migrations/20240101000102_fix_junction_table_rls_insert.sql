-- ============================================================
-- Migration 000102: Fix junction table RLS — INSERT requires WITH CHECK
--
-- All six junction tables had `FOR ALL USING (condition)` which
-- does not cover INSERT operations in PostgreSQL (INSERT needs
-- `WITH CHECK`).  This caused silent permission-denied errors
-- whenever admins tried to add content (routines, videos,
-- nutrition plans) to plans or promotions.
--
-- Fix: drop each broken policy and replace it with separate
-- INSERT (WITH CHECK) and DELETE (USING) policies.
-- ============================================================

-- ── plan_routines ─────────────────────────────────────────────
DROP POLICY IF EXISTS "plan_routines_admin_write" ON public.plan_routines;

CREATE POLICY "plan_routines_admin_insert" ON public.plan_routines
  FOR INSERT WITH CHECK (public.has_permission('billing.manage'));

CREATE POLICY "plan_routines_admin_delete" ON public.plan_routines
  FOR DELETE USING (public.has_permission('billing.manage'));

-- ── promotion_routines ────────────────────────────────────────
DROP POLICY IF EXISTS "promotion_routines_admin_write" ON public.promotion_routines;

CREATE POLICY "promotion_routines_admin_insert" ON public.promotion_routines
  FOR INSERT WITH CHECK (public.has_permission('billing.manage'));

CREATE POLICY "promotion_routines_admin_delete" ON public.promotion_routines
  FOR DELETE USING (public.has_permission('billing.manage'));

-- ── plan_nutritions ───────────────────────────────────────────
DROP POLICY IF EXISTS "plan_nutritions_admin_write" ON public.plan_nutritions;

CREATE POLICY "plan_nutritions_admin_insert" ON public.plan_nutritions
  FOR INSERT WITH CHECK (public.has_permission('billing.manage'));

CREATE POLICY "plan_nutritions_admin_delete" ON public.plan_nutritions
  FOR DELETE USING (public.has_permission('billing.manage'));

-- ── promotion_nutritions ──────────────────────────────────────
DROP POLICY IF EXISTS "promotion_nutritions_admin_write" ON public.promotion_nutritions;

CREATE POLICY "promotion_nutritions_admin_insert" ON public.promotion_nutritions
  FOR INSERT WITH CHECK (public.has_permission('billing.manage'));

CREATE POLICY "promotion_nutritions_admin_delete" ON public.promotion_nutritions
  FOR DELETE USING (public.has_permission('billing.manage'));

-- ── plan_videos ───────────────────────────────────────────────
DROP POLICY IF EXISTS "plan_videos_admin_write" ON public.plan_videos;

CREATE POLICY "plan_videos_admin_insert" ON public.plan_videos
  FOR INSERT WITH CHECK (public.has_permission('billing.manage'));

CREATE POLICY "plan_videos_admin_delete" ON public.plan_videos
  FOR DELETE USING (public.has_permission('billing.manage'));

-- ── promotion_videos ──────────────────────────────────────────
DROP POLICY IF EXISTS "promotion_videos_admin_write" ON public.promotion_videos;

CREATE POLICY "promotion_videos_admin_insert" ON public.promotion_videos
  FOR INSERT WITH CHECK (public.has_permission('billing.manage'));

CREATE POLICY "promotion_videos_admin_delete" ON public.promotion_videos
  FOR DELETE USING (public.has_permission('billing.manage'));
