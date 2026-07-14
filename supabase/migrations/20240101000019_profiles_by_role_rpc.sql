-- RPC: get_profiles_by_role
-- Returns profiles within the caller's tenant filtered by role name.
-- Used by admin to list clients and coaches.

CREATE OR REPLACE FUNCTION public.get_profiles_by_role(role_name TEXT)
RETURNS TABLE (
  id            UUID,
  tenant_id     UUID,
  full_name     TEXT,
  phone         TEXT,
  date_of_birth DATE,
  is_active     BOOLEAN,
  approval_status TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ
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
    p.created_at
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE p.tenant_id = public.get_tenant_id()
    AND r.name = role_name
  ORDER BY p.full_name ASC;
$$;

-- Allow authenticated users to call this RPC
GRANT EXECUTE ON FUNCTION public.get_profiles_by_role(TEXT) TO authenticated;