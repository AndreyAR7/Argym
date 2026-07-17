-- handle_new_user() defaults tenant_id to the oldest active tenant when
-- Google OAuth signup carries no tenant metadata (reasonable back when
-- CaroGym was the only tenant). set_own_branch() then corrects tenant_id
-- to match whichever branch the user actually picked on /select-branch —
-- but trg_protect_approval_fields unconditionally blocks any tenant_id
-- change, so picking a branch belonging to a *different* tenant than the
-- default (e.g. Impetú, CaroGym being older) failed with
-- "tenant_id cannot be changed". This is a legitimate, expected change
-- for a not-yet-approved user completing signup — bypass the guard here.

CREATE OR REPLACE FUNCTION public.set_own_branch(p_branch_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND branch_id IS NULL
  ) THEN
    RAISE EXCEPTION 'branch_already_set';
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.branches
  WHERE id = p_branch_id AND is_active = TRUE;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'branch_not_found';
  END IF;

  PERFORM set_config('app.bypass_approval_trigger', 'true', true);
  UPDATE public.profiles
  SET branch_id = p_branch_id,
      tenant_id = v_tenant_id
  WHERE id = auth.uid();
END;
$$;
