-- ============================================================
-- Migration 000074: Content access RLS
--
-- The previous broad "tenant_read" policies allowed ANY tenant
-- member (including clients without a subscription) to read
-- all videos and nutrition plans.
--
-- This migration replaces them with role-specific policies:
--   · Staff (has routines.create) → can read all content
--   · Clients → only what they have access to:
--       - is_free videos
--       - level-gated videos (allowed_levels contains their level)
--       - individually assigned (video_assignments / nutrition_assignments)
--       - content in their active plan (plan_videos / plan_nutritions)
--       - content in their active promotion (promotion_videos / promotion_nutritions)
-- ============================================================

-- ── VIDEOS ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "videos_tenant_read" ON public.videos;

-- Admins and coaches (with routines.create) can read all tenant videos
CREATE POLICY "videos_staff_read" ON public.videos
  FOR SELECT USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('routines.create')
  );

-- Clients: free, level-gated, individually assigned, or via subscription
CREATE POLICY "videos_subscriber_read" ON public.videos
  FOR SELECT USING (
    tenant_id = public.get_tenant_id()
    AND (
      -- Free / teaser videos
      is_free = TRUE

      -- Level-gated: video targets a level AND client's level matches
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.client_level IS NOT NULL
          AND array_length(videos.allowed_levels, 1) > 0
          AND p.client_level = ANY(videos.allowed_levels::TEXT[])
      )

      -- Directly assigned to this client by a coach
      OR EXISTS (
        SELECT 1 FROM public.video_assignments va
        WHERE va.video_id = videos.id
          AND va.client_id = auth.uid()
      )

      -- Included in an active subscription's plan
      OR EXISTS (
        SELECT 1 FROM public.user_subscriptions sub
        JOIN public.plan_videos pv ON pv.plan_id = sub.plan_id
        WHERE sub.user_id = auth.uid()
          AND sub.tenant_id = public.get_tenant_id()
          AND sub.status = 'active'
          AND pv.video_id = videos.id
      )

      -- Included in the promotion used by an active subscription
      OR EXISTS (
        SELECT 1 FROM public.user_subscriptions sub
        JOIN public.promotion_videos prv ON prv.promotion_id = sub.promotion_id
        WHERE sub.user_id = auth.uid()
          AND sub.tenant_id = public.get_tenant_id()
          AND sub.status = 'active'
          AND sub.promotion_id IS NOT NULL
          AND prv.video_id = videos.id
      )
    )
  );

-- ── NUTRITION PLANS ──────────────────────────────────────────

DROP POLICY IF EXISTS "nutrition_plans_tenant_read" ON public.nutrition_plans;

-- Staff can read all nutrition plans in their tenant
CREATE POLICY "nutrition_plans_staff_read" ON public.nutrition_plans
  FOR SELECT USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('routines.create')
  );

-- Clients: individually assigned or via active subscription plan/promotion
CREATE POLICY "nutrition_plans_subscriber_read" ON public.nutrition_plans
  FOR SELECT USING (
    tenant_id = public.get_tenant_id()
    AND (
      -- Directly assigned to this client
      EXISTS (
        SELECT 1 FROM public.nutrition_assignments na
        WHERE na.nutrition_plan_id = nutrition_plans.id
          AND na.client_id = auth.uid()
      )

      -- Included in an active subscription's plan
      OR EXISTS (
        SELECT 1 FROM public.user_subscriptions sub
        JOIN public.plan_nutritions pn ON pn.plan_id = sub.plan_id
        WHERE sub.user_id = auth.uid()
          AND sub.tenant_id = public.get_tenant_id()
          AND sub.status = 'active'
          AND pn.nutrition_plan_id = nutrition_plans.id
      )

      -- Included in the promotion used by an active subscription
      OR EXISTS (
        SELECT 1 FROM public.user_subscriptions sub
        JOIN public.promotion_nutritions prn ON prn.promotion_id = sub.promotion_id
        WHERE sub.user_id = auth.uid()
          AND sub.tenant_id = public.get_tenant_id()
          AND sub.status = 'active'
          AND sub.promotion_id IS NOT NULL
          AND prn.nutrition_plan_id = nutrition_plans.id
      )
    )
  );
