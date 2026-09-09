-- get_profiles_by_role() INNER JOINs user_roles, which is only populated
-- once an admin approves someone — a self-registered user still sitting
-- in pending/rejected has no user_roles row yet and is invisible to
-- every caller of this RPC. This was already discovered and worked
-- around locally in /admin/clients (unioned with a direct
-- requested_role query there), but every OTHER caller — the coach/
-- client picker in /admin/appointments, the coach picker in
-- /admin/clases — still has the bug. Fixing it once here, in the RPC
-- itself, covers all of them (the /admin/clients workaround becomes
-- redundant but harmless — it still dedupes the same rows).

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
SET search_path = public
AS $$
  SELECT p.id, p.tenant_id, p.full_name, p.phone, p.date_of_birth,
         p.is_active, p.approval_status, p.avatar_url, p.client_level, p.created_at
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE p.tenant_id = public.get_tenant_id()
    AND r.name = role_name

  UNION

  SELECT p.id, p.tenant_id, p.full_name, p.phone, p.date_of_birth,
         p.is_active, p.approval_status, p.avatar_url, p.client_level, p.created_at
  FROM public.profiles p
  WHERE p.tenant_id = public.get_tenant_id()
    AND p.requested_role = role_name

  ORDER BY full_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_by_role(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profiles_by_role(TEXT) FROM anon;
