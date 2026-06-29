-- ============================================================
-- Migration 000090: Security hardening
--
-- 1. Enable RLS on app_internal_config (defense in depth on top of REVOKE)
-- 2. Lock down analytics RPCs: REVOKE from PUBLIC/anon, GRANT to
--    authenticated + service_role (internal admin checks still apply)
-- 3. Lock down cron/utility functions from anon access
-- ============================================================

-- ── 1. RLS on app_internal_config ───────────────────────────────────────
-- The table is already protected by REVOKE ALL FROM anon/authenticated.
-- Enabling RLS adds a second layer: even if a future migration accidentally
-- grants SELECT, no rows are visible without an explicit policy.
ALTER TABLE public.app_internal_config ENABLE ROW LEVEL SECURITY;
-- No policies added — zero rows visible to any role by default.
-- Only the SECURITY DEFINER function get_webhook_secret() can read it.

-- ── 2. Analytics RPCs: lock down to authenticated + service_role ─────────
-- By default PostgreSQL grants EXECUTE on new functions to PUBLIC, meaning
-- unauthenticated (anon) users could call these endpoints. The functions
-- have internal admin-role checks, but the defence-in-depth practice is to
-- also block at the grant level.

-- analytics_revenue_summary
REVOKE ALL     ON FUNCTION public.analytics_revenue_summary(UUID)    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_revenue_summary(UUID)    FROM anon;
GRANT  EXECUTE ON FUNCTION public.analytics_revenue_summary(UUID)    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.analytics_revenue_summary(UUID)    TO service_role;

-- analytics_monthly_revenue
REVOKE ALL     ON FUNCTION public.analytics_monthly_revenue(UUID)    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_monthly_revenue(UUID)    FROM anon;
GRANT  EXECUTE ON FUNCTION public.analytics_monthly_revenue(UUID)    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.analytics_monthly_revenue(UUID)    TO service_role;

-- analytics_top_plans
REVOKE ALL     ON FUNCTION public.analytics_top_plans(UUID)          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_top_plans(UUID)          FROM anon;
GRANT  EXECUTE ON FUNCTION public.analytics_top_plans(UUID)          TO authenticated;
GRANT  EXECUTE ON FUNCTION public.analytics_top_plans(UUID)          TO service_role;

-- analytics_top_promotions
REVOKE ALL     ON FUNCTION public.analytics_top_promotions(UUID)     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_top_promotions(UUID)     FROM anon;
GRANT  EXECUTE ON FUNCTION public.analytics_top_promotions(UUID)     TO authenticated;
GRANT  EXECUTE ON FUNCTION public.analytics_top_promotions(UUID)     TO service_role;

-- analytics_top_users
REVOKE ALL     ON FUNCTION public.analytics_top_users(UUID)          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_top_users(UUID)          FROM anon;
GRANT  EXECUTE ON FUNCTION public.analytics_top_users(UUID)          TO authenticated;
GRANT  EXECUTE ON FUNCTION public.analytics_top_users(UUID)          TO service_role;

-- analytics_branch_performance
REVOKE ALL     ON FUNCTION public.analytics_branch_performance(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_branch_performance(UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION public.analytics_branch_performance(UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.analytics_branch_performance(UUID) TO service_role;

-- analytics_top_videos
REVOKE ALL     ON FUNCTION public.analytics_top_videos(UUID)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_top_videos(UUID)         FROM anon;
GRANT  EXECUTE ON FUNCTION public.analytics_top_videos(UUID)         TO authenticated;
GRANT  EXECUTE ON FUNCTION public.analytics_top_videos(UUID)         TO service_role;

-- analytics_weekly_activity
REVOKE ALL     ON FUNCTION public.analytics_weekly_activity(UUID)    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_weekly_activity(UUID)    FROM anon;
GRANT  EXECUTE ON FUNCTION public.analytics_weekly_activity(UUID)    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.analytics_weekly_activity(UUID)    TO service_role;

-- ── 3. Tighten other utility functions ───────────────────────────────────
-- get_tenant_id and has_permission are called from RLS policies (always
-- authenticated context); anon should never reach them.
REVOKE ALL ON FUNCTION public.get_webhook_secret()            FROM anon;
REVOKE ALL ON FUNCTION public.send_appointment_reminders()   FROM anon;
REVOKE ALL ON FUNCTION public.send_expiring_plan_warnings()  FROM anon;
