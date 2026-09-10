-- ============================================================
-- sendClientInvitationAction had no way to check whether the invited
-- email already belongs to an account before creating an invite + sending
-- a "create your account" email — confusing for someone who already has
-- one, and their eventual signUp attempt would just fail unclearly.
-- ============================================================
CREATE OR REPLACE FUNCTION public.email_has_account(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.email_has_account(TEXT) TO authenticated;
