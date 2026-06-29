-- ── Email Logs: add body_html + retry tracking ──────────────────────────────
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS body_html    TEXT,
  ADD COLUMN IF NOT EXISTS retry_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_status_created
  ON public.email_logs(tenant_id, status, created_at DESC);

-- ── Analytics: revenue summary (KPI cards) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_revenue_summary(p_tenant_id UUID)
RETURNS TABLE (
  total_revenue          NUMERIC,
  this_month_revenue     NUMERIC,
  last_month_revenue     NUMERIC,
  ytd_revenue            NUMERIC,
  active_subscriptions   BIGINT,
  new_subs_this_month    BIGINT,
  total_clients          BIGINT,
  new_clients_this_month BIGINT,
  pending_approvals      BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id
      AND r.name IN ('admin','superadmin')
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  RETURN QUERY SELECT
    (SELECT COALESCE(SUM(s.final_price),0) FROM user_subscriptions s WHERE s.tenant_id = p_tenant_id),
    (SELECT COALESCE(SUM(s.final_price),0) FROM user_subscriptions s WHERE s.tenant_id = p_tenant_id
       AND DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', NOW())),
    (SELECT COALESCE(SUM(s.final_price),0) FROM user_subscriptions s WHERE s.tenant_id = p_tenant_id
       AND DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')),
    (SELECT COALESCE(SUM(s.final_price),0) FROM user_subscriptions s WHERE s.tenant_id = p_tenant_id
       AND EXTRACT(YEAR FROM s.created_at) = EXTRACT(YEAR FROM NOW())),
    (SELECT COUNT(*) FROM user_subscriptions s WHERE s.tenant_id = p_tenant_id AND s.status = 'active'),
    (SELECT COUNT(*) FROM user_subscriptions s WHERE s.tenant_id = p_tenant_id
       AND DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', NOW())),
    (SELECT COUNT(*) FROM profiles p2 WHERE p2.tenant_id = p_tenant_id AND p2.approval_status = 'approved' AND p2.is_active = TRUE),
    (SELECT COUNT(*) FROM profiles p2 WHERE p2.tenant_id = p_tenant_id
       AND DATE_TRUNC('month', p2.created_at) = DATE_TRUNC('month', NOW())),
    (SELECT COUNT(*) FROM profiles p2 WHERE p2.tenant_id = p_tenant_id AND p2.approval_status = 'pending');
END;
$$;

-- ── Monthly revenue (last 13 months) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_monthly_revenue(p_tenant_id UUID)
RETURNS TABLE (year_month TEXT, revenue NUMERIC, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id AND r.name IN ('admin','superadmin')
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', s.created_at), 'YYYY-MM') AS year_month,
    COALESCE(SUM(s.final_price), 0) AS revenue,
    COUNT(*) AS count
  FROM user_subscriptions s
  WHERE s.tenant_id = p_tenant_id
    AND s.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
  GROUP BY DATE_TRUNC('month', s.created_at)
  ORDER BY year_month;
END;
$$;

-- ── Top plans ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_top_plans(p_tenant_id UUID)
RETURNS TABLE (plan_name TEXT, purchases BIGINT, revenue NUMERIC, currency TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id AND r.name IN ('admin','superadmin')
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  RETURN QUERY
  SELECT
    pl.name AS plan_name,
    COUNT(s.id) AS purchases,
    COALESCE(SUM(s.final_price), 0) AS revenue,
    pl.currency
  FROM plans pl
  LEFT JOIN user_subscriptions s ON s.plan_id = pl.id AND s.tenant_id = p_tenant_id
  WHERE pl.tenant_id = p_tenant_id
  GROUP BY pl.id, pl.name, pl.currency
  ORDER BY purchases DESC
  LIMIT 10;
END;
$$;

-- ── Top promotions ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_top_promotions(p_tenant_id UUID)
RETURNS TABLE (promo_title TEXT, uses BIGINT, avg_discount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id AND r.name IN ('admin','superadmin')
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  RETURN QUERY
  SELECT
    pr.title AS promo_title,
    COUNT(s.id) AS uses,
    COALESCE(AVG(pl.price - s.final_price), 0) AS avg_discount
  FROM promotions pr
  LEFT JOIN user_subscriptions s ON s.promotion_id = pr.id AND s.tenant_id = p_tenant_id
  LEFT JOIN plans pl ON pl.id = s.plan_id
  WHERE pr.tenant_id = p_tenant_id
  GROUP BY pr.id, pr.title
  ORDER BY uses DESC
  LIMIT 10;
END;
$$;

-- ── Top users (revenue + activity) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_top_users(p_tenant_id UUID)
RETURNS TABLE (full_name TEXT, revenue NUMERIC, subscriptions BIGINT, appointments BIGINT, measurements BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id AND r.name IN ('admin','superadmin')
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  RETURN QUERY
  SELECT
    p2.full_name,
    COALESCE(SUM(s.final_price), 0) AS revenue,
    COUNT(DISTINCT s.id) AS subscriptions,
    COUNT(DISTINCT a.id) AS appointments,
    COUNT(DISTINCT m.id) AS measurements
  FROM profiles p2
  LEFT JOIN user_subscriptions s ON s.user_id = p2.id AND s.tenant_id = p_tenant_id
  LEFT JOIN appointments a ON a.client_id = p2.id AND a.tenant_id = p_tenant_id
  LEFT JOIN body_measurements m ON m.client_id = p2.id AND m.tenant_id = p_tenant_id
  WHERE p2.tenant_id = p_tenant_id AND p2.approval_status = 'approved'
  GROUP BY p2.id, p2.full_name
  HAVING COALESCE(SUM(s.final_price), 0) > 0 OR COUNT(DISTINCT a.id) > 0
  ORDER BY revenue DESC, appointments DESC
  LIMIT 15;
END;
$$;

-- ── Branch performance ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_branch_performance(p_tenant_id UUID)
RETURNS TABLE (branch_name TEXT, clients BIGINT, coaches BIGINT, revenue NUMERIC, appointments BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id AND r.name IN ('admin','superadmin')
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  RETURN QUERY
  SELECT
    b.name AS branch_name,
    COUNT(DISTINCT p2.id) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = p2.id AND ur2.tenant_id = p_tenant_id AND r2.name = 'coach'
      )
    ) AS clients,
    COUNT(DISTINCT p2.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = p2.id AND ur2.tenant_id = p_tenant_id AND r2.name = 'coach'
      )
    ) AS coaches,
    COALESCE(SUM(DISTINCT s.final_price), 0) AS revenue,
    COUNT(DISTINCT a.id) AS appointments
  FROM branches b
  LEFT JOIN profiles p2 ON p2.branch_id = b.id AND p2.tenant_id = p_tenant_id AND p2.approval_status = 'approved'
  LEFT JOIN user_subscriptions s ON s.user_id = p2.id AND s.tenant_id = p_tenant_id
  LEFT JOIN appointments a ON a.tenant_id = p_tenant_id AND a.client_id = p2.id
  WHERE b.tenant_id = p_tenant_id AND b.is_active = TRUE
  GROUP BY b.id, b.name
  ORDER BY revenue DESC;
END;
$$;

-- ── Top videos ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_top_videos(p_tenant_id UUID)
RETURNS TABLE (video_title TEXT, assignments BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id AND r.name IN ('admin','superadmin')
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  RETURN QUERY
  SELECT
    v.title AS video_title,
    COUNT(va.id) AS assignments
  FROM videos v
  LEFT JOIN video_assignments va ON va.video_id = v.id AND va.tenant_id = p_tenant_id
  WHERE v.tenant_id = p_tenant_id
  GROUP BY v.id, v.title
  ORDER BY assignments DESC
  LIMIT 10;
END;
$$;

-- ── Weekly activity (last 12 weeks) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.analytics_weekly_activity(p_tenant_id UUID)
RETURNS TABLE (year_week TEXT, appointments BIGINT, new_subscriptions BIGINT, revenue NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id AND r.name IN ('admin','superadmin')
  ) THEN RAISE EXCEPTION 'access_denied'; END IF;

  RETURN QUERY
  WITH weeks AS (
    SELECT generate_series(
      DATE_TRUNC('week', NOW() - INTERVAL '11 weeks'),
      DATE_TRUNC('week', NOW()),
      INTERVAL '1 week'
    ) AS week_start
  )
  SELECT
    TO_CHAR(w.week_start, 'YYYY-"W"IW') AS year_week,
    COUNT(DISTINCT a.id) AS appointments,
    COUNT(DISTINCT s.id) AS new_subscriptions,
    COALESCE(SUM(s.final_price), 0) AS revenue
  FROM weeks w
  LEFT JOIN appointments a ON a.tenant_id = p_tenant_id
    AND DATE_TRUNC('week', a.created_at) = w.week_start
  LEFT JOIN user_subscriptions s ON s.tenant_id = p_tenant_id
    AND DATE_TRUNC('week', s.created_at) = w.week_start
  GROUP BY w.week_start
  ORDER BY w.week_start;
END;
$$;
