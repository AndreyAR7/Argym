-- Update get_users_by_approval_status to also return avatar_url.
-- Callers should use this SECURITY DEFINER RPC instead of a direct
-- SELECT on profiles — direct SELECT is subject to RLS edge cases.
-- DROP + CREATE because PostgreSQL rejects CREATE OR REPLACE when the return type changes.

DROP FUNCTION IF EXISTS public.get_users_by_approval_status(TEXT);

CREATE FUNCTION public.get_users_by_approval_status(p_status TEXT)
RETURNS TABLE (
  id               UUID,
  full_name        TEXT,
  avatar_url       TEXT,
  requested_role   TEXT,
  approval_status  TEXT,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Solo administradores pueden listar usuarios';
  END IF;

  SELECT public.get_tenant_id() INTO v_tenant_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant activo no encontrado';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.requested_role,
    p.approval_status,
    p.rejection_reason,
    p.created_at
  FROM public.profiles p
  WHERE p.tenant_id = v_tenant_id
    AND p.approval_status = p_status
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_by_approval_status(TEXT) TO authenticated;

-- Returns a count for each approval_status in the current tenant.
-- Used by the approvals page tabs to show badge numbers.

DROP FUNCTION IF EXISTS public.get_approval_status_counts CASCADE;
CREATE OR REPLACE FUNCTION public.get_approval_status_counts()
RETURNS TABLE (status TEXT, cnt BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'Solo administradores pueden ver estas estadísticas';
  END IF;

  SELECT public.get_tenant_id() INTO v_tenant_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant activo no encontrado';
  END IF;

  RETURN QUERY
  SELECT p.approval_status::TEXT, COUNT(*)::BIGINT
  FROM public.profiles p
  WHERE p.tenant_id = v_tenant_id
  GROUP BY p.approval_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_approval_status_counts() TO authenticated;
