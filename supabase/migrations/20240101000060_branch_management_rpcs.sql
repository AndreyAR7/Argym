-- Branch Management RPCs
-- Migration: 20240101000060_branch_management_rpcs.sql

-- ============================================================
-- 1. get_branches_with_stats()
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_branches_with_stats()
RETURNS TABLE (
    id          uuid,
    tenant_id   uuid,
    name        text,
    address     text,
    phone       text,
    email       text,
    is_active   boolean,
    created_at  timestamptz,
    updated_at  timestamptz,
    client_count bigint,
    coach_count  bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        b.id,
        b.tenant_id,
        b.name,
        b.address,
        b.phone,
        b.email,
        b.is_active,
        b.created_at,
        b.updated_at,
        COUNT(DISTINCT CASE WHEN r.name = 'client' THEN p.id END) AS client_count,
        COUNT(DISTINCT CASE WHEN r.name = 'coach'  THEN p.id END) AS coach_count
    FROM public.branches b
    LEFT JOIN public.profiles p
        ON p.branch_id = b.id
    LEFT JOIN public.user_roles ur
        ON ur.user_id = p.id
    LEFT JOIN public.roles r
        ON r.id = ur.role_id
    WHERE b.tenant_id = public.get_tenant_id()
    GROUP BY
        b.id,
        b.tenant_id,
        b.name,
        b.address,
        b.phone,
        b.email,
        b.is_active,
        b.created_at,
        b.updated_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_branches_with_stats() TO authenticated;


-- ============================================================
-- 2. assign_user_to_branch(p_user_id uuid, p_branch_id uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_user_to_branch(
    p_user_id  uuid,
    p_branch_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin  boolean;
BEGIN
    v_tenant_id := public.get_tenant_id();

    -- Verify caller is admin within the current tenant
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND r.name = 'admin'
          AND ur.tenant_id = v_tenant_id
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Solo administradores pueden reasignar sucursales';
    END IF;

    -- If a branch is provided, verify it belongs to the current tenant
    IF p_branch_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.branches
            WHERE id = p_branch_id
              AND tenant_id = v_tenant_id
        ) THEN
            RAISE EXCEPTION 'La sucursal indicada no pertenece al tenant actual';
        END IF;
    END IF;

    -- Reassign the user to the branch (or clear it when p_branch_id IS NULL)
    UPDATE public.profiles
    SET    branch_id  = p_branch_id,
           updated_at = now()
    WHERE  id        = p_user_id
      AND  tenant_id = v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_user_to_branch(uuid, uuid) TO authenticated;
