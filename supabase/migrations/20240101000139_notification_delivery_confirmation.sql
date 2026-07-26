-- ============================================================
-- Migration 000139: Real delivery confirmation for push notifications
--
-- process_notification_queue() fired an async net.http_post() to notify-push
-- and then immediately marked the whole batch 'sent' — net.http_post queues
-- the HTTP call and returns instantly, so "sent" never actually meant Expo
-- (or even notify-push itself) received anything. A row could be marked
-- 'sent' while notify-push was down, timed out, or Expo rejected every
-- message, and nothing would ever retry it.
--
-- Fix, in two parts:
--   1. process_notification_queue() no longer marks rows 'sent'. It claims
--      them into 'processing' and fires the request, same as before, but
--      leaves the real status to notify-push, which now knows the true
--      per-notification outcome (see part 2) and writes it back directly
--      with its service-role client. A stale-processing sweep at the top of
--      each run resets rows stuck in 'processing' for >5 minutes back to
--      'pending' (bumping retry_count), so a notify-push crash or an
--      undelivered pg_net request can't strand a row forever; after 5
--      retries a row is marked 'failed' instead of retried indefinitely.
--   2. notify-push (supabase/functions/notify-push/index.ts, this same
--      migration's companion deploy) now receives each notification's queue
--      id, reads Expo's per-message delivery tickets, and writes 'sent' or
--      'failed' back onto notification_queue — and deactivates any device
--      token Expo reports as DeviceNotRegistered (finding #14 from the same
--      audit: dead tokens were never pruned, so uninstalled/reset devices
--      kept "receiving" pushes that Expo silently dropped).
-- ============================================================

DROP FUNCTION IF EXISTS public.process_notification_queue CASCADE;
CREATE OR REPLACE FUNCTION public.process_notification_queue(
  p_batch_size INT DEFAULT 50
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_ids     UUID[];
  v_secret  TEXT;
  v_count   INT := 0;
BEGIN
  -- Rows notify-push never confirmed (crash, timeout, dropped pg_net
  -- request) would otherwise stay 'processing' forever. Retry a few times,
  -- then give up so a permanently-broken row doesn't loop forever either.
  UPDATE public.notification_queue
     SET status      = CASE WHEN retry_count >= 5 THEN 'failed' ELSE 'pending' END,
         retry_count = retry_count + 1,
         error_msg   = 'stale processing row reclaimed'
   WHERE status = 'processing'
     AND created_at < NOW() - INTERVAL '5 minutes';

  WITH claimed AS (
    UPDATE public.notification_queue
       SET status = 'processing'
     WHERE id IN (
       SELECT id
         FROM public.notification_queue
        WHERE status = 'pending'
          AND channel = 'push'
        ORDER BY created_at
        LIMIT p_batch_size
          FOR UPDATE SKIP LOCKED
     )
    RETURNING id
  )
  SELECT array_agg(id) INTO v_ids FROM claimed;

  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RETURN 0;
  END IF;

  v_secret := (
    SELECT value FROM public.app_internal_config
     WHERE key = 'internal_webhook_secret'
  );

  PERFORM net.http_post(
    url     := public.get_functions_base_url() || '/functions/v1/notify-push',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', v_secret
    ),
    body    := (
      SELECT jsonb_build_object(
        'notifications',
        jsonb_agg(
          jsonb_build_object(
            'id',      nq.id::text,
            'user_id', nq.user_id::text,
            'title',   nq.title,
            'message', nq.message,
            'type',    nq.notification_type
          )
        )
      )
      FROM public.notification_queue nq
      WHERE nq.id = ANY(v_ids)
    )
  );

  -- Status is now notify-push's responsibility (see index.ts) — it knows
  -- which pushes Expo actually accepted. Rows it can't reach in time are
  -- picked up by the stale-processing sweep above on the next run.
  v_count := array_length(v_ids, 1);
  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.notification_queue
     SET status      = 'pending',
         retry_count = retry_count + 1,
         error_msg   = SQLERRM
   WHERE id = ANY(v_ids);
  RETURN 0;
END;
$$;

REVOKE ALL ON FUNCTION public.process_notification_queue(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_notification_queue(INT) TO service_role;
