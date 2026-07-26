-- ============================================================
-- Migration 000138: device_tokens must be unique per physical
-- device token, not per (user, token) pair.
--
-- A push token identifies one physical device/app install. With
-- UNIQUE(user_id, token), logging out User A without going through
-- the explicit unregister flow (crash, forced session expiry) and
-- then logging in as User B on the same device inserted a SECOND
-- row for the same token instead of reassigning it — notify-push
-- queries active tokens by user_id, so both A and B received each
-- other's push notifications on that device indefinitely.
--
-- Dedup first (defensive — no duplicates existed as of this
-- migration, but this makes the migration safe to run against any
-- environment): keep the most recently created active row per
-- token, drop the rest, before adding the global unique index.
-- ============================================================

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY token
           ORDER BY is_active DESC, created_at DESC
         ) AS rn
  FROM public.device_tokens
)
DELETE FROM public.device_tokens
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.device_tokens DROP CONSTRAINT IF EXISTS device_tokens_user_id_token_key;
ALTER TABLE public.device_tokens ADD CONSTRAINT device_tokens_token_key UNIQUE (token);
