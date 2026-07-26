-- ============================================================
-- Migration 000143: switch_platform_admin_tenant() must also clear
-- the stale branch assignment
--
-- The RPC (migration 000122) only ever updated profiles.tenant_id. If
-- the platform admin had a branch_id set from whatever tenant they
-- were last in, that FK still resolves (branches.id exists) but now
-- points at a branch belonging to a DIFFERENT tenant than
-- profiles.tenant_id — nothing enforces that the two agree. Any code
-- that trusts profile.branch_id to already belong to profile.tenant_id
-- (the assumption every other write path relies on) would silently
-- act on the wrong branch.
--
-- Fix: NULL it out on every tenant switch, same as what already
-- happens when a branch itself is deleted (ON DELETE SET NULL) — "no
-- branch selected yet" is the correct, already-handled state, and
-- set_own_branch() (migration 000123) is exactly the existing
-- one-time-claim flow for picking a new one if the admin needs one.
-- ============================================================

CREATE OR REPLACE FUNCTION public.switch_platform_admin_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_active BOOLEAN;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can switch tenants';
  END IF;

  SELECT is_active INTO v_is_active FROM public.tenants WHERE id = p_tenant_id;
  IF v_is_active IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  PERFORM set_config('app.bypass_approval_trigger', 'true', true);
  UPDATE public.profiles
     SET tenant_id = p_tenant_id,
         branch_id = NULL
   WHERE id = auth.uid();

  RETURN v_is_active;
END;
$$;
