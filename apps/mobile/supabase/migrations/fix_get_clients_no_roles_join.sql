-- Fix get_clients_with_plan: remove user_roles INNER JOIN dependency.
-- Previously, clients without a user_roles entry never appeared in the list,
-- making routine/video assignment impossible for those users.
-- Now uses approval_status = 'approved' as the sole filter for client profiles.
CREATE OR REPLACE FUNCTION get_clients_with_plan()
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
  client_level    TEXT,
  plan_name       TEXT,
  plan_tier       TEXT,
  promotion_id    UUID,
  promotion_title TEXT,
  is_active       BOOLEAN,
  approval_status TEXT,
  created_at      TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (p.id)
    p.id,
    p.full_name,
    p.client_level,
    pl.name          AS plan_name,
    pl.plan_tier,
    us.promotion_id,
    promo.title      AS promotion_title,
    p.is_active,
    p.approval_status,
    p.created_at
  FROM profiles p
  LEFT JOIN user_subscriptions us
    ON  us.user_id   = p.id
    AND us.tenant_id = p.tenant_id
    AND us.status    = 'active'
  LEFT JOIN plans pl    ON pl.id    = us.plan_id
  LEFT JOIN promotions promo ON promo.id = us.promotion_id
  WHERE p.tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1
  )
  AND p.approval_status = 'approved'
  AND p.id != auth.uid()
  ORDER BY p.id, us.created_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_clients_with_plan() TO authenticated;
