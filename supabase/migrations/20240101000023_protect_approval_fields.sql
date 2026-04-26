-- Trigger that prevents any user (including self) from directly modifying
-- sensitive approval fields via UPDATE. These fields can only be changed
-- by the SECURITY DEFINER functions approve_user() and reject_user().

CREATE OR REPLACE FUNCTION public.protect_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow SECURITY DEFINER context (approve_user / reject_user) to bypass
  IF current_setting('role', true) = 'rls_bypasser' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status   IS DISTINCT FROM OLD.approval_status   THEN
    RAISE EXCEPTION 'approval_status can only be changed by an administrator';
  END IF;
  IF NEW.approved_by       IS DISTINCT FROM OLD.approved_by       THEN
    RAISE EXCEPTION 'approved_by can only be changed by an administrator';
  END IF;
  IF NEW.approved_at       IS DISTINCT FROM OLD.approved_at       THEN
    RAISE EXCEPTION 'approved_at can only be changed by an administrator';
  END IF;
  IF NEW.rejection_reason  IS DISTINCT FROM OLD.rejection_reason  THEN
    RAISE EXCEPTION 'rejection_reason can only be changed by an administrator';
  END IF;
  IF NEW.tenant_id         IS DISTINCT FROM OLD.tenant_id         THEN
    RAISE EXCEPTION 'tenant_id cannot be changed';
  END IF;
  IF NEW.is_active         IS DISTINCT FROM OLD.is_active         THEN
    -- Allow admins (has_permission check), block everyone else
    IF NOT public.has_permission('tenant.manage_users') THEN
      RAISE EXCEPTION 'is_active can only be changed by an administrator';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_approval_fields ON public.profiles;

CREATE TRIGGER trg_protect_approval_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_approval_fields();