-- A rejected self-registration had no way back: the user's email already
-- exists in auth.users, so re-registering fails, and there was no
-- "request review again" action anywhere -- an admin had to delete the
-- auth user manually to let someone retry. Adds:
--   1. profiles.rejection_count, incremented by reject_user(). On the 3rd
--      rejection the account is marked 'blocked' (permanent, no more
--      self-service retries) instead of 'rejected' (retriable).
--   2. resubmit_registration(): lets the rejected user themselves put
--      their own profile back to 'pending' for another review, as long
--      as they haven't hit the block.
-- Admins are unaffected: approve_user()/reject_user() still work on a
-- 'blocked' profile exactly as before, this only limits the user's own
-- self-service retry.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rejection_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'blocked'));

CREATE OR REPLACE FUNCTION public.reject_user(
  p_user_id  UUID,
  p_reason   TEXT,
  p_admin_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_tenant_id    UUID;
  v_admin_tenant UUID;
  v_new_count    INT;
BEGIN
  IF NOT public.has_permission('tenant.manage_users') THEN
    RAISE EXCEPTION 'Insufficient permissions to reject users';
  END IF;

  SELECT tenant_id INTO v_admin_tenant
    FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_tenant IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found';
  END IF;

  SELECT tenant_id INTO v_tenant_id
    FROM public.profiles WHERE id = p_user_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_tenant_id <> v_admin_tenant THEN
    RAISE EXCEPTION 'Cannot reject users from a different tenant';
  END IF;

  -- Use app.* custom GUC — settable inside SECURITY DEFINER functions
  PERFORM set_config('app.bypass_approval_trigger', 'true', true);

  UPDATE public.profiles SET
    approval_status  = CASE WHEN rejection_count + 1 >= 3 THEN 'blocked' ELSE 'rejected' END,
    rejection_count  = rejection_count + 1,
    is_active        = FALSE,
    approved_by      = p_admin_id,
    approved_at      = NOW(),
    rejection_reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Sin motivo especificado')
  WHERE id = p_user_id
  RETURNING rejection_count INTO v_new_count;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The rejected user puts themselves back in the review queue. Only works
-- from 'rejected' (not 'pending'/'approved'/'blocked') — a 3rd rejection
-- already flipped the profile to 'blocked' before this could run again.
CREATE OR REPLACE FUNCTION public.resubmit_registration(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Cannot resubmit registration on behalf of another user';
  END IF;

  SELECT approval_status INTO v_status
    FROM public.profiles WHERE id = p_user_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_status = 'blocked' THEN
    RAISE EXCEPTION 'This account has been permanently blocked after repeated rejections';
  END IF;

  IF v_status <> 'rejected' THEN
    RAISE EXCEPTION 'Only a rejected registration can be resubmitted';
  END IF;

  PERFORM set_config('app.bypass_approval_trigger', 'true', true);

  UPDATE public.profiles SET
    approval_status  = 'pending',
    rejection_reason = NULL
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resubmit_registration(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resubmit_registration(UUID) TO authenticated;
