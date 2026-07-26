-- ============================================================
-- Migration 000141: Ranking "en vivo" solo se actualizaba en vivo
-- para el propio usuario
--
-- leaderboard-realtime.tsx (client) subscribes to postgres_changes on
-- user_game_stats with no explicit filter, so it looks like it should
-- receive every member's XP change. It doesn't: Realtime evaluates
-- postgres_changes per-subscriber against that subscriber's own RLS
-- policies, and user_game_stats_own_select only lets a client see
-- their own row. In practice a client only ever gets the event when
-- their own XP changes — the green "En vivo" dot is misleading.
--
-- Fix: broadcast a tiny, non-RLS-gated notice (same pattern already
-- used for the monitor kiosk's check-in feed — Realtime Broadcast,
-- not postgres_changes) whenever any user_game_stats row in a tenant
-- changes, and have the client listen on Broadcast instead. The
-- client already does a full get_leaderboard() RPC refetch on any
-- change signal, so the broadcast payload only needs to say "someone
-- in this tenant changed" — the RPC (already filtered correctly per
-- viewer) supplies the real data.
-- ============================================================

INSERT INTO public.app_internal_config (key, value)
VALUES ('supabase_anon_key', 'sb_publishable_J15vMNsT3gAZnB8PzccCQQ_92WsyoX0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public._gam_broadcast_leaderboard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_anon_key TEXT;
BEGIN
  v_anon_key := (SELECT value FROM public.app_internal_config WHERE key = 'supabase_anon_key');

  PERFORM net.http_post(
    url     := public.get_functions_base_url() || '/realtime/v1/api/broadcast',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        v_anon_key,
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body    := jsonb_build_object(
      'messages', jsonb_build_array(
        jsonb_build_object(
          'topic',   'leaderboard:tenant:' || NEW.tenant_id::text,
          'event',   'update',
          'payload', jsonb_build_object('user_id', NEW.user_id),
          'private', false
        )
      )
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Best-effort notice — never fail the XP/streak/badge update itself
  -- just because the leaderboard couldn't be pinged.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gam_broadcast_leaderboard_update ON public.user_game_stats;
CREATE TRIGGER trg_gam_broadcast_leaderboard_update
  AFTER INSERT OR UPDATE ON public.user_game_stats
  FOR EACH ROW
  EXECUTE FUNCTION public._gam_broadcast_leaderboard_update();
