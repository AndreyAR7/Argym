-- ============================================================
-- Migration 000148: Notification triggers swallow errors unevenly
--
-- Almost every notification trigger/helper (000095) catches
-- `WHEN OTHERS` and does nothing (`NULL;` / `RETURN NEW;`) — correct,
-- since a notification failure must never block the real DML it's
-- riding on. But "swallow silently" makes an expected, harmless
-- failure (a transient network blip) indistinguishable from a real
-- bug in the trigger itself — there was no way to tell them apart
-- after the fact. Only process_notification_queue's own retry path
-- happened to persist SQLERRM onto the row it failed to process.
--
-- Fix: every one of these handlers now RAISE WARNING with the real
-- SQLERRM before continuing exactly as before — still never blocks
-- or fails the calling statement (a WARNING isn't an error), but now
-- shows up in Postgres/Supabase logs instead of vanishing.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enqueue_push_notification(
  p_user_id           UUID,
  p_tenant_id         UUID,
  p_event_type        TEXT,
  p_notification_type TEXT,
  p_title             TEXT,
  p_message           TEXT,
  p_payload           JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_queue (
    user_id, tenant_id, event_type, channel,
    notification_type, title, message, payload
  ) VALUES (
    p_user_id, p_tenant_id, p_event_type, 'push',
    p_notification_type, p_title, p_message, p_payload
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'enqueue_push_notification failed (event_type=%, user_id=%): %', p_event_type, p_user_id, SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_push_plan_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.status IS NOT DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;

  SELECT name INTO v_plan_name
    FROM public.plans WHERE id = NEW.plan_id;

  PERFORM public.enqueue_push_notification(
    NEW.user_id,
    NEW.tenant_id,
    'plan_purchased',
    'subscription',
    'Plan activado',
    '¡Tu plan ' || COALESCE(v_plan_name, '') || ' está activo! Comienza a disfrutar tus beneficios.',
    jsonb_build_object(
      'subscription_id', NEW.id::text,
      'plan_id',         NEW.plan_id::text
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_notify_push_plan_purchased failed (subscription_id=%): %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_expiring_subscription_pushes(
  p_days INT DEFAULT 3
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row   RECORD;
  v_count INT := 0;
BEGIN
  FOR v_row IN
    SELECT * FROM public.check_expiring_subscriptions(p_days)
  LOOP
    BEGIN
      INSERT INTO public.notification_queue (
        user_id, tenant_id, event_type, channel,
        notification_type, title, message, payload
      ) VALUES (
        v_row.user_id,
        v_row.tenant_id,
        'subscription_expiring',
        'push',
        'subscription',
        'Tu plan está por vencer',
        'Tu plan ' || COALESCE(v_row.plan_name, '') ||
          ' vence el ' || to_char(v_row.end_date, 'DD/MM/YYYY') ||
          '. Renuévalo para no perder el acceso.',
        jsonb_build_object(
          'subscription_id', v_row.subscription_id::text,
          'end_date',        v_row.end_date::text
        )
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'enqueue_expiring_subscription_pushes failed (subscription_id=%): %', v_row.subscription_id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;
