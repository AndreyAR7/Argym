-- Function: expire active subscriptions whose plan has passed its expiry_date.
-- Called daily by the expire-plan-subscriptions Edge Function cron job.
-- Safe to call multiple times (idempotent).

DROP FUNCTION IF EXISTS public.expire_subscriptions_for_expired_plans CASCADE;
CREATE OR REPLACE FUNCTION public.expire_subscriptions_for_expired_plans()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE user_subscriptions us
  SET    status     = 'expired',
         end_date   = COALESCE(us.end_date, p.expiry_date),
         updated_at = NOW()
  FROM   plans p
  WHERE  us.plan_id      = p.id
    AND  p.expiry_date   IS NOT NULL
    AND  p.expiry_date   < NOW()
    AND  us.status       = 'active';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Allow the service role (used by Edge Functions) to call it
GRANT EXECUTE ON FUNCTION public.expire_subscriptions_for_expired_plans() TO service_role;
