-- ============================================================
-- Google-only accounts have no password (encrypted_password is
-- NULL/empty in auth.users) — the "change password" forms on web
-- and mobile always asked for the CURRENT password first, which
-- such a user can never supply. This RPC lets both clients ask
-- "does this user even have a password to verify?" before deciding
-- whether to render/require that field.
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_password()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(encrypted_password, '') <> ''
  FROM auth.users
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.user_has_password() TO authenticated;
