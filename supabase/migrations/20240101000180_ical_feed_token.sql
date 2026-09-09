-- Read-only calendar sync: each profile can get an opaque, unguessable
-- token that the new ical-feed edge function accepts in place of a real
-- login — calendar apps (Apple/Google Calendar, Outlook) subscribe to a
-- webcal:// URL with no way to attach a Supabase session, so the token
-- itself is the credential.
--
-- Deliberately a separate table, NOT a column on profiles: the existing
-- "profiles_tenant_isolation" policy lets any authenticated user in a
-- tenant SELECT every column of every other profile in that tenant (it's
-- how coach/client pickers work everywhere in this app) — a bearer token
-- living on that row would leak to every tenant-mate on day one. This
-- table's own RLS only ever lets a user read/write their own row.

CREATE TABLE public.ical_tokens (
  user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  token      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ
);

ALTER TABLE public.ical_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ical_tokens_own" ON public.ical_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Returns the caller's token, creating the row on first call.
CREATE OR REPLACE FUNCTION public.get_or_create_ical_token()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  INSERT INTO public.ical_tokens (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT token INTO v_token FROM public.ical_tokens WHERE user_id = auth.uid();
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_ical_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_ical_token() TO authenticated;

-- Rotates the caller's token (e.g. a shared link leaked) without needing
-- admin involvement or direct table access.
CREATE OR REPLACE FUNCTION public.rotate_ical_token()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token UUID := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  INSERT INTO public.ical_tokens (user_id, token, rotated_at)
  VALUES (auth.uid(), v_new_token, NOW())
  ON CONFLICT (user_id) DO UPDATE SET token = v_new_token, rotated_at = NOW();

  RETURN v_new_token;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_ical_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_ical_token() TO authenticated;
