-- ============================================================
-- Migration 000092: Analytics — time filters + executive KPIs + detail tables
--
-- Adds date-range overloads to all existing RPCs and creates new
-- detailed-table RPCs (clients, transactions, subscriptions, appointments)
-- plus an executive KPIs function (MRR, ARR, churn, ARPU).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. EXECUTIVE KPIs (MRR · ARR · churn · ARPU · fill-rate)
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_executive_kpis CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_executive_kpis(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ DEFAULT '-infinity',
  p_to        TIMESTAMPTZ DEFAULT 'infinity'
)
RETURNS TABLE (
  period_revenue           NUMERIC,
  prev_period_revenue      NUMERIC,
  mrr                      NUMERIC,
  arr                      NUMERIC,
  arpu                     NUMERIC,
  avg_subscription_value   NUMERIC,
  new_subscriptions        BIGINT,
  cancelled_subscriptions  BIGINT,
  churn_rate_pct           NUMERIC,
  active_clients           BIGINT,
  total_appointments       BIGINT,
  completed_appointments   BIGINT,
  cancelled_appointments   BIGINT,
  appointment_fill_rate    NUMERIC,
  cancellation_rate        NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration INTERVAL;
  v_prev_from TIMESTAMPTZ;
  v_prev_to   TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id
      AND r.name IN ('admin','superadmin')
  ) THEN RETURN; END IF;

  -- Compute previous period of same duration for comparison
  v_duration  := p_to - p_from;
  v_prev_from := p_from - v_duration;
  v_prev_to   := p_from;

  RETURN QUERY
  WITH
  period_rev AS (
    SELECT COALESCE(SUM(us.final_price), 0) AS rev
    FROM user_subscriptions us
    WHERE us.tenant_id = p_tenant_id
      AND us.status IN ('active','expired')
      AND us.start_date BETWEEN p_from AND p_to
  ),
  prev_rev AS (
    SELECT COALESCE(SUM(us.final_price), 0) AS rev
    FROM user_subscriptions us
    WHERE us.tenant_id = p_tenant_id
      AND us.status IN ('active','expired')
      AND us.start_date BETWEEN v_prev_from AND v_prev_to
  ),
  -- MRR from currently active subscriptions
  mrr_calc AS (
    SELECT COALESCE(SUM(
      CASE p.billing_cycle
        WHEN 'monthly' THEN us.final_price
        WHEN 'yearly'  THEN us.final_price / 12.0
        ELSE 0
      END
    ), 0) AS mrr
    FROM user_subscriptions us
    JOIN plans p ON p.id = us.plan_id
    WHERE us.tenant_id = p_tenant_id AND us.status = 'active'
  ),
  active_cl AS (
    SELECT COUNT(*) AS n
    FROM profiles
    WHERE tenant_id = p_tenant_id AND approval_status = 'approved' AND is_active = TRUE
  ),
  new_subs AS (
    SELECT COUNT(*) AS n
    FROM user_subscriptions
    WHERE tenant_id = p_tenant_id AND start_date BETWEEN p_from AND p_to
  ),
  cancelled_subs AS (
    SELECT COUNT(*) AS n
    FROM user_subscriptions
    WHERE tenant_id = p_tenant_id AND status = 'cancelled'
      AND updated_at BETWEEN p_from AND p_to
  ),
  avg_sub AS (
    SELECT COALESCE(AVG(final_price), 0) AS v
    FROM user_subscriptions
    WHERE tenant_id = p_tenant_id AND start_date BETWEEN p_from AND p_to
      AND final_price IS NOT NULL
  ),
  appt_stats AS (
    SELECT
      COUNT(*)                                           AS total,
      COUNT(*) FILTER (WHERE status = 'completed')      AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')      AS cancelled
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND start_time BETWEEN p_from AND p_to
  )
  SELECT
    period_rev.rev,
    prev_rev.rev,
    mrr_calc.mrr,
    mrr_calc.mrr * 12,
    CASE WHEN active_cl.n > 0 THEN period_rev.rev / active_cl.n ELSE 0 END,
    avg_sub.v,
    new_subs.n,
    cancelled_subs.n,
    CASE WHEN new_subs.n + cancelled_subs.n > 0
         THEN ROUND(cancelled_subs.n::NUMERIC / NULLIF(new_subs.n + cancelled_subs.n, 0) * 100, 2)
         ELSE 0 END,
    active_cl.n,
    appt_stats.total,
    appt_stats.completed,
    appt_stats.cancelled,
    CASE WHEN appt_stats.total > 0
         THEN ROUND(appt_stats.completed::NUMERIC / appt_stats.total * 100, 2)
         ELSE 0 END,
    CASE WHEN appt_stats.total > 0
         THEN ROUND(appt_stats.cancelled::NUMERIC / appt_stats.total * 100, 2)
         ELSE 0 END
  FROM period_rev, prev_rev, mrr_calc, active_cl, new_subs, cancelled_subs, avg_sub, appt_stats;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. REVENUE SUMMARY with date range
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_revenue_summary CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_revenue_summary(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
)
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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id
      AND r.name IN ('admin','superadmin')
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(us.final_price) FILTER (WHERE us.start_date BETWEEN p_from AND p_to), 0),
    COALESCE(SUM(us.final_price) FILTER (WHERE us.start_date >= date_trunc('month', NOW())), 0),
    COALESCE(SUM(us.final_price) FILTER (WHERE us.start_date >= date_trunc('month', NOW() - INTERVAL '1 month')
                                           AND us.start_date < date_trunc('month', NOW())), 0),
    COALESCE(SUM(us.final_price) FILTER (WHERE us.start_date >= date_trunc('year', NOW())), 0),
    COUNT(us.id) FILTER (WHERE us.status = 'active'),
    COUNT(us.id) FILTER (WHERE us.start_date >= date_trunc('month', NOW())),
    (SELECT COUNT(*) FROM profiles WHERE tenant_id = p_tenant_id AND approval_status = 'approved' AND is_active = TRUE),
    (SELECT COUNT(*) FROM profiles WHERE tenant_id = p_tenant_id AND approval_status = 'approved'
                                    AND created_at >= date_trunc('month', NOW())),
    (SELECT COUNT(*) FROM profiles WHERE tenant_id = p_tenant_id AND approval_status = 'pending')
  FROM user_subscriptions us
  WHERE us.tenant_id = p_tenant_id
    AND us.status IN ('active','expired','cancelled');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. MONTHLY REVENUE with date range
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_monthly_revenue CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_monthly_revenue(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
)
RETURNS TABLE (year_month TEXT, revenue NUMERIC, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    TO_CHAR(date_trunc('month', us.start_date), 'YYYY-MM') AS year_month,
    COALESCE(SUM(us.final_price), 0)::NUMERIC,
    COUNT(us.id)::BIGINT
  FROM user_subscriptions us
  WHERE us.tenant_id = p_tenant_id
    AND us.status IN ('active','expired')
    AND us.start_date BETWEEN p_from AND p_to
  GROUP BY date_trunc('month', us.start_date)
  ORDER BY date_trunc('month', us.start_date);
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. TOP PLANS with date range
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_top_plans CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_top_plans(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
)
RETURNS TABLE (plan_name TEXT, purchases BIGINT, revenue NUMERIC, currency TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.name,
    COUNT(us.id)::BIGINT,
    COALESCE(SUM(us.final_price), 0)::NUMERIC,
    p.currency
  FROM user_subscriptions us
  JOIN plans p ON p.id = us.plan_id
  WHERE us.tenant_id = p_tenant_id
    AND us.start_date BETWEEN p_from AND p_to
  GROUP BY p.id, p.name, p.currency
  ORDER BY SUM(us.final_price) DESC NULLS LAST;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. TOP PROMOTIONS with date range
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_top_promotions CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_top_promotions(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
)
RETURNS TABLE (promo_title TEXT, uses BIGINT, avg_discount NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    pr.title,
    COUNT(us.id)::BIGINT,
    COALESCE(AVG(
      CASE
        WHEN pr.discount_percentage IS NOT NULL THEN pr.discount_percentage
        WHEN pr.discount_amount     IS NOT NULL THEN pr.discount_amount
        ELSE 0
      END
    ), 0)::NUMERIC
  FROM user_subscriptions us
  JOIN promotions pr ON pr.id = us.promotion_id
  WHERE us.tenant_id = p_tenant_id
    AND us.start_date BETWEEN p_from AND p_to
  GROUP BY pr.id, pr.title
  ORDER BY COUNT(us.id) DESC;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. TOP USERS with date range
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_top_users CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_top_users(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
)
RETURNS TABLE (full_name TEXT, revenue NUMERIC, subscriptions BIGINT, appointments BIGINT, measurements BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    pr.full_name,
    COALESCE(SUM(DISTINCT us.final_price), 0)::NUMERIC,
    COUNT(DISTINCT us.id)::BIGINT,
    COUNT(DISTINCT a.id)::BIGINT,
    COUNT(DISTINCT bm.id)::BIGINT
  FROM profiles pr
  LEFT JOIN user_subscriptions us ON us.user_id = pr.id AND us.tenant_id = p_tenant_id
    AND us.start_date BETWEEN p_from AND p_to
  LEFT JOIN appointments a ON a.client_id = pr.id AND a.tenant_id = p_tenant_id
    AND a.start_time BETWEEN p_from AND p_to
  LEFT JOIN body_measurements bm ON bm.client_id = pr.id AND bm.tenant_id = p_tenant_id
    AND bm.measured_at BETWEEN p_from AND p_to
  WHERE pr.tenant_id = p_tenant_id AND pr.approval_status = 'approved'
  GROUP BY pr.id, pr.full_name
  HAVING COUNT(DISTINCT us.id) > 0 OR COUNT(DISTINCT a.id) > 0
  ORDER BY SUM(DISTINCT us.final_price) DESC NULLS LAST
  LIMIT 50;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. BRANCH PERFORMANCE with date range
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_branch_performance CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_branch_performance(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
)
RETURNS TABLE (branch_name TEXT, clients BIGINT, coaches BIGINT, revenue NUMERIC, appointments BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id
      AND r.name IN ('admin','superadmin')
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    b.name::TEXT,
    COUNT(DISTINCT pr.id) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = pr.id AND ur2.tenant_id = p_tenant_id AND r2.name = 'coach'
      )
    )::BIGINT,
    COUNT(DISTINCT pr.id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = pr.id AND ur2.tenant_id = p_tenant_id AND r2.name = 'coach'
      )
    )::BIGINT,
    COALESCE(SUM(DISTINCT us.final_price) FILTER (WHERE us.start_date BETWEEN p_from AND p_to), 0)::NUMERIC,
    COUNT(DISTINCT a.id) FILTER (WHERE a.start_time BETWEEN p_from AND p_to)::BIGINT
  FROM branches b
  LEFT JOIN profiles pr ON pr.branch_id = b.id AND pr.tenant_id = p_tenant_id AND pr.approval_status = 'approved'
  LEFT JOIN user_subscriptions us ON us.user_id = pr.id AND us.tenant_id = p_tenant_id
  LEFT JOIN appointments a ON a.tenant_id = p_tenant_id AND a.client_id = pr.id
  WHERE b.tenant_id = p_tenant_id
  GROUP BY b.id, b.name
  ORDER BY SUM(DISTINCT us.final_price) FILTER (WHERE us.start_date BETWEEN p_from AND p_to) DESC NULLS LAST;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 8. TOP VIDEOS with date range
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_top_videos CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_top_videos(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
)
RETURNS TABLE (video_title TEXT, assignments BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.title, COUNT(va.id)::BIGINT
  FROM videos v
  LEFT JOIN video_assignments va ON va.video_id = v.id
    AND va.assigned_at BETWEEN p_from AND p_to
  WHERE v.tenant_id = p_tenant_id
  GROUP BY v.id, v.title
  ORDER BY COUNT(va.id) DESC
  LIMIT 20;
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. WEEKLY ACTIVITY with date range
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_weekly_activity CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_weekly_activity(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ
)
RETURNS TABLE (year_week TEXT, appointments BIGINT, new_subscriptions BIGINT, revenue NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH weeks AS (
    SELECT generate_series(
      date_trunc('week', p_from),
      date_trunc('week', LEAST(p_to, NOW())),
      INTERVAL '1 week'
    ) AS wk
  )
  SELECT
    TO_CHAR(w.wk, 'IYYY"W"IW'),
    COUNT(DISTINCT a.id)::BIGINT,
    COUNT(DISTINCT us.id)::BIGINT,
    COALESCE(SUM(us.final_price), 0)::NUMERIC
  FROM weeks w
  LEFT JOIN appointments a ON a.tenant_id = p_tenant_id
    AND date_trunc('week', a.start_time) = w.wk
  LEFT JOIN user_subscriptions us ON us.tenant_id = p_tenant_id
    AND date_trunc('week', us.start_date) = w.wk
  GROUP BY w.wk
  ORDER BY w.wk;
$$;

-- ─────────────────────────────────────────────────────────────
-- 10. DETAILED CLIENTS TABLE (all columns)
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_detailed_clients CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_detailed_clients(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ DEFAULT '-infinity',
  p_to        TIMESTAMPTZ DEFAULT 'infinity'
)
RETURNS TABLE (
  full_name              TEXT,
  email                  TEXT,
  phone                  TEXT,
  client_level           TEXT,
  branch_name            TEXT,
  join_date              TIMESTAMPTZ,
  approval_status        TEXT,
  is_active              BOOLEAN,
  total_revenue          NUMERIC,
  active_plans           BIGINT,
  total_subscriptions    BIGINT,
  total_appointments     BIGINT,
  completed_appointments BIGINT,
  measurements_count     BIGINT,
  last_appointment_date  TIMESTAMPTZ,
  last_subscription_date TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    pr.full_name,
    au.email,
    pr.phone,
    pr.client_level::TEXT,
    b.name,
    pr.created_at,
    pr.approval_status::TEXT,
    pr.is_active,
    COALESCE(SUM(us.final_price) FILTER (WHERE us.start_date BETWEEN p_from AND p_to), 0)::NUMERIC,
    COUNT(us.id) FILTER (WHERE us.status = 'active')::BIGINT,
    COUNT(us.id) FILTER (WHERE us.start_date BETWEEN p_from AND p_to)::BIGINT,
    COUNT(a.id)  FILTER (WHERE a.start_time BETWEEN p_from AND p_to)::BIGINT,
    COUNT(a.id)  FILTER (WHERE a.status = 'completed' AND a.start_time BETWEEN p_from AND p_to)::BIGINT,
    COUNT(bm.id) FILTER (WHERE bm.measured_at BETWEEN p_from AND p_to)::BIGINT,
    MAX(a.start_time)  FILTER (WHERE a.start_time BETWEEN p_from AND p_to),
    MAX(us.start_date) FILTER (WHERE us.start_date BETWEEN p_from AND p_to)
  FROM profiles pr
  JOIN auth.users au ON au.id = pr.id
  LEFT JOIN branches b ON b.id = pr.branch_id
  LEFT JOIN user_subscriptions us ON us.user_id = pr.id AND us.tenant_id = p_tenant_id
  LEFT JOIN appointments a ON a.client_id = pr.id AND a.tenant_id = p_tenant_id
  LEFT JOIN body_measurements bm ON bm.client_id = pr.id AND bm.tenant_id = p_tenant_id
  WHERE pr.tenant_id = p_tenant_id AND pr.approval_status IN ('approved','pending')
  GROUP BY pr.id, pr.full_name, au.email, pr.phone, pr.client_level,
           b.name, pr.created_at, pr.approval_status, pr.is_active
  ORDER BY pr.created_at DESC;
$$;

-- ─────────────────────────────────────────────────────────────
-- 11. DETAILED TRANSACTIONS / INVOICES TABLE
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_detailed_transactions CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_detailed_transactions(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ DEFAULT '-infinity',
  p_to        TIMESTAMPTZ DEFAULT 'infinity'
)
RETURNS TABLE (
  invoice_number        TEXT,
  invoice_date          TIMESTAMPTZ,
  client_name           TEXT,
  client_email          TEXT,
  plan_name             TEXT,
  billing_cycle         TEXT,
  amount                NUMERIC,
  currency              TEXT,
  invoice_status        TEXT,
  payment_reference     TEXT,
  promotion_title       TEXT,
  discount_applied      TEXT,
  stripe_subscription_id TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    inv.invoice_number,
    inv.created_at,
    pr.full_name,
    au.email,
    p.name,
    p.billing_cycle::TEXT,
    inv.amount::NUMERIC,
    p.currency,
    inv.status::TEXT,
    us.payment_reference,
    prom.title,
    CASE
      WHEN prom.discount_percentage IS NOT NULL THEN prom.discount_percentage::TEXT || '%'
      WHEN prom.discount_amount     IS NOT NULL THEN prom.discount_amount::TEXT
      ELSE NULL
    END,
    us.stripe_subscription_id
  FROM invoices inv
  JOIN user_subscriptions us ON us.id = inv.subscription_id
  JOIN profiles pr ON pr.id = us.user_id
  JOIN auth.users au ON au.id = pr.id
  JOIN plans p ON p.id = us.plan_id
  LEFT JOIN promotions prom ON prom.id = us.promotion_id
  WHERE inv.tenant_id = p_tenant_id
    AND inv.created_at BETWEEN p_from AND p_to
  ORDER BY inv.created_at DESC;
$$;

-- ─────────────────────────────────────────────────────────────
-- 12. DETAILED SUBSCRIPTIONS TABLE
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_detailed_subscriptions CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_detailed_subscriptions(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ DEFAULT '-infinity',
  p_to        TIMESTAMPTZ DEFAULT 'infinity'
)
RETURNS TABLE (
  start_date             TIMESTAMPTZ,
  end_date               TIMESTAMPTZ,
  client_name            TEXT,
  client_email           TEXT,
  plan_name              TEXT,
  billing_cycle          TEXT,
  status                 TEXT,
  amount                 NUMERIC,
  currency               TEXT,
  payment_reference      TEXT,
  stripe_subscription_id TEXT,
  promotion_applied      TEXT,
  days_remaining         INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    us.start_date,
    us.end_date,
    pr.full_name,
    au.email,
    p.name,
    p.billing_cycle::TEXT,
    us.status::TEXT,
    us.final_price::NUMERIC,
    p.currency,
    us.payment_reference,
    us.stripe_subscription_id,
    prom.title,
    CASE
      WHEN us.end_date IS NULL THEN NULL
      WHEN us.end_date < NOW() THEN 0
      ELSE EXTRACT(DAY FROM us.end_date - NOW())::INTEGER
    END
  FROM user_subscriptions us
  JOIN profiles pr ON pr.id = us.user_id
  JOIN auth.users au ON au.id = pr.id
  JOIN plans p ON p.id = us.plan_id
  LEFT JOIN promotions prom ON prom.id = us.promotion_id
  WHERE us.tenant_id = p_tenant_id
    AND us.start_date BETWEEN p_from AND p_to
  ORDER BY us.start_date DESC;
$$;

-- ─────────────────────────────────────────────────────────────
-- 13. DETAILED APPOINTMENTS TABLE
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.analytics_detailed_appointments CASCADE;
CREATE OR REPLACE FUNCTION public.analytics_detailed_appointments(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ DEFAULT '-infinity',
  p_to        TIMESTAMPTZ DEFAULT 'infinity'
)
RETURNS TABLE (
  appointment_date  TIMESTAMPTZ,
  end_time          TIMESTAMPTZ,
  title             TEXT,
  appointment_type  TEXT,
  status            TEXT,
  client_name       TEXT,
  client_email      TEXT,
  coach_name        TEXT,
  location          TEXT,
  duration_minutes  INTEGER,
  notes             TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.start_time,
    a.end_time,
    a.title,
    a.appointment_type::TEXT,
    a.status::TEXT,
    client_pr.full_name,
    client_au.email,
    coach_pr.full_name,
    a.location,
    EXTRACT(EPOCH FROM (a.end_time - a.start_time))::INTEGER / 60,
    a.notes
  FROM appointments a
  LEFT JOIN profiles client_pr ON client_pr.id = a.client_id
  LEFT JOIN auth.users client_au ON client_au.id = a.client_id
  LEFT JOIN profiles coach_pr ON coach_pr.id = a.coach_id
  WHERE a.tenant_id = p_tenant_id
    AND a.start_time BETWEEN p_from AND p_to
  ORDER BY a.start_time DESC;
$$;

-- ─────────────────────────────────────────────────────────────
-- 14. GRANTS on all new functions
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'analytics_executive_kpis(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_revenue_summary(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_monthly_revenue(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_top_plans(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_top_promotions(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_top_users(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_branch_performance(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_top_videos(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_weekly_activity(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_detailed_clients(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_detailed_transactions(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_detailed_subscriptions(UUID,TIMESTAMPTZ,TIMESTAMPTZ)',
    'analytics_detailed_appointments(UUID,TIMESTAMPTZ,TIMESTAMPTZ)'
  ] LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION public.' || fn || ' FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.' || fn || ' FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.' || fn || ' TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.' || fn || ' TO service_role';
  END LOOP;
END $$;
