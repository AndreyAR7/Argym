-- ── client_level column on profiles ──────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_level TEXT
    CHECK (client_level IN ('beginner', 'intermediate', 'advanced'));

-- ── Update get_profiles_by_role to include client_level ──────
DROP FUNCTION IF EXISTS public.get_profiles_by_role(TEXT);
CREATE OR REPLACE FUNCTION public.get_profiles_by_role(role_name TEXT)
RETURNS TABLE (
  id              UUID,
  tenant_id       UUID,
  full_name       TEXT,
  phone           TEXT,
  date_of_birth   DATE,
  is_active       BOOLEAN,
  approval_status TEXT,
  avatar_url      TEXT,
  client_level    TEXT,
  created_at      TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.tenant_id,
    p.full_name,
    p.phone,
    p.date_of_birth,
    p.is_active,
    p.approval_status,
    p.avatar_url,
    p.client_level,
    p.created_at
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE p.tenant_id = public.get_tenant_id()
    AND r.name = role_name
  ORDER BY p.full_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_by_role(TEXT) TO authenticated;

-- ── RPC: get_clients_with_plan ────────────────────────────────
-- Returns clients with their active plan name (for selector in appointments)
CREATE OR REPLACE FUNCTION public.get_clients_with_plan()
RETURNS TABLE (
  id           UUID,
  full_name    TEXT,
  client_level TEXT,
  plan_name    TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.full_name,
    p.client_level,
    pl.name AS plan_name
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
  JOIN public.roles r ON r.id = ur.role_id
  LEFT JOIN public.user_subscriptions us
    ON us.user_id = p.id
    AND us.tenant_id = p.tenant_id
    AND us.status = 'active'
  LEFT JOIN public.plans pl ON pl.id = us.plan_id
  WHERE p.tenant_id = public.get_tenant_id()
    AND r.name = 'client'
    AND p.is_active = TRUE
    AND p.approval_status = 'approved'
  ORDER BY p.full_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_clients_with_plan() TO authenticated;
