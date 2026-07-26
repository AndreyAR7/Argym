-- ============================================================
-- Migration 000150: Rate limit changePasswordAction
--
-- changePasswordAction verifies the current password via
-- signInWithPassword with no application-level limit on repeated wrong
-- guesses — an already-authenticated attacker (stolen session, shared
-- device) could brute-force the real current password at their own
-- pace with no lockout. Adds a small per-user attempt counter with a
-- short lockout after repeated failures.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.password_change_attempts (
  user_id      UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  failed_count INT         NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.password_change_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: only touched via the SECURITY DEFINER RPCs below.

CREATE OR REPLACE FUNCTION public.check_password_change_lock()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT locked_until FROM public.password_change_attempts
   WHERE user_id = auth.uid() AND locked_until > NOW()
$$;

REVOKE ALL ON FUNCTION public.check_password_change_lock() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_password_change_lock() TO authenticated;

CREATE OR REPLACE FUNCTION public.record_password_change_failure()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_count  INT;
  v_locked TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.password_change_attempts (user_id, failed_count, updated_at)
  VALUES (v_uid, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET failed_count = CASE
                          -- A prior lock that already expired starts a fresh count
                          -- instead of adding onto a stale one.
                          WHEN public.password_change_attempts.locked_until IS NOT NULL
                               AND public.password_change_attempts.locked_until < NOW()
                          THEN 1
                          ELSE public.password_change_attempts.failed_count + 1
                        END,
        updated_at = NOW()
  RETURNING failed_count INTO v_count;

  IF v_count >= 5 THEN
    v_locked := NOW() + INTERVAL '15 minutes';
    UPDATE public.password_change_attempts SET locked_until = v_locked WHERE user_id = v_uid;
  END IF;

  RETURN v_locked;
END;
$$;

REVOKE ALL ON FUNCTION public.record_password_change_failure() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_password_change_failure() TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_password_change_lock()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.password_change_attempts
     SET failed_count = 0, locked_until = NULL, updated_at = NOW()
   WHERE user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.clear_password_change_lock() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_password_change_lock() TO authenticated;
