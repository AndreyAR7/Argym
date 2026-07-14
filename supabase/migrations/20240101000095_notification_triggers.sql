-- ============================================================
-- Migration 000095: Notification queue + push-notification triggers
--
-- Adds:
--   1. notification_queue table — durable queue for all outbound
--      notifications (push + email), processable by Edge Functions
--      and pollable from Next.js server actions.
--   2. DB triggers that INSERT into notification_queue when key
--      events occur (appointment status changes, profile approval).
--      These are ADDITIVE to the existing send-communication triggers
--      in migrations 054 / 059 / 066 / 089; they add push delivery
--      and a queryable audit trail without touching existing logic.
--   3. check_expiring_subscriptions() — SQL helper that the
--      expire-plan-subscriptions Edge Function can call to retrieve
--      subscriptions expiring within 3 days and queue notifications
--      for them.
--   4. trigger_push_notification() — generic helper that inserts a
--      push-channel row into notification_queue, shared by all triggers.
-- ============================================================

-- ── 1. notification_queue table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id)  ON DELETE CASCADE,
  event_type   TEXT        NOT NULL,
  -- channel: 'push' | 'email' | 'in_app'
  channel      TEXT        NOT NULL DEFAULT 'push',
  -- notification_type maps to the 'type' field consumed by notify-push Edge Function
  notification_type TEXT   NOT NULL DEFAULT 'info',
  title        TEXT        NOT NULL,
  message      TEXT        NOT NULL,
  payload      JSONB       NOT NULL DEFAULT '{}',
  -- status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped'
  status       TEXT        NOT NULL DEFAULT 'pending',
  retry_count  INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_msg    TEXT
);

-- Indexes for the processor query pattern (poll pending rows in order)
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending
  ON public.notification_queue(status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_user
  ON public.notification_queue(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_queue_tenant
  ON public.notification_queue(tenant_id, created_at DESC);

-- ── 2. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can read their own queued notifications (e.g. to show delivery status)
CREATE POLICY "notification_queue_own_read"
  ON public.notification_queue FOR SELECT
  USING (user_id = auth.uid());

-- Admins can read all notifications within their tenant
CREATE POLICY "notification_queue_admin_read"
  ON public.notification_queue FOR SELECT
  USING (
    tenant_id = public.get_tenant_id()
    AND EXISTS (
      SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
       WHERE ur.user_id   = auth.uid()
         AND ur.tenant_id = public.get_tenant_id()
         AND r.name = 'admin'
    )
  );

-- Only service_role (Edge Functions, triggers via SECURITY DEFINER) may INSERT/UPDATE
-- No INSERT policy for authenticated — callers must use the queue_notification() RPC below.
-- service_role bypasses RLS entirely, so no explicit policy needed for it.

-- ── 3. RPC: queue_notification() — safe insert from server actions ──────────
-- Called from Next.js server actions (or any authenticated context) to enqueue
-- a notification.  The function validates tenant membership before inserting,
-- preventing cross-tenant writes even if the caller supplies a wrong tenant_id.

DROP FUNCTION IF EXISTS public.queue_notification CASCADE;
CREATE OR REPLACE FUNCTION public.queue_notification(
  p_user_id          UUID,
  p_tenant_id        UUID,
  p_event_type       TEXT,
  p_channel          TEXT,
  p_notification_type TEXT,
  p_title            TEXT,
  p_message          TEXT,
  p_payload          JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_tenant UUID;
  v_inserted_id   UUID;
BEGIN
  -- Verify the calling user belongs to the given tenant
  SELECT tenant_id INTO v_caller_tenant
    FROM public.profiles WHERE id = auth.uid();

  IF v_caller_tenant IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'Tenant mismatch — cannot queue notification for a different tenant';
  END IF;

  -- Verify the target user exists in the same tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = p_user_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Target user not found in tenant';
  END IF;

  INSERT INTO public.notification_queue (
    user_id, tenant_id, event_type, channel,
    notification_type, title, message, payload
  ) VALUES (
    p_user_id, p_tenant_id, p_event_type, p_channel,
    p_notification_type, p_title, p_message, p_payload
  )
  RETURNING id INTO v_inserted_id;

  RETURN v_inserted_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.queue_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB)
  TO authenticated;

-- ── 4. Internal trigger helper: enqueue a push notification ─────────────────
-- Used by all trigger functions below. SECURITY DEFINER so it can write to
-- notification_queue regardless of the triggering session's RLS context.
-- Errors are swallowed — notifications must never block the originating DML.

DROP FUNCTION IF EXISTS public.enqueue_push_notification CASCADE;
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
  -- Never propagate notification errors to the calling trigger
  NULL;
END;
$$;

-- Only service_role and trigger functions (SECURITY DEFINER) call this
REVOKE ALL  ON FUNCTION public.enqueue_push_notification(UUID,UUID,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL  ON FUNCTION public.enqueue_push_notification(UUID,UUID,TEXT,TEXT,TEXT,TEXT,JSONB) FROM anon;
REVOKE ALL  ON FUNCTION public.enqueue_push_notification(UUID,UUID,TEXT,TEXT,TEXT,TEXT,JSONB) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.enqueue_push_notification(UUID,UUID,TEXT,TEXT,TEXT,TEXT,JSONB) TO service_role;

-- ── 5. Trigger: appointment_confirmed → push to client ───────────────────────
-- Fires on UPDATE when status transitions to 'confirmed'.
-- Complements the send-communication email trigger in migration 089.

DROP FUNCTION IF EXISTS public.trg_notify_push_appointment_confirmed CASCADE;
CREATE OR REPLACE FUNCTION public.trg_notify_push_appointment_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title   TEXT;
  v_message TEXT;
BEGIN
  -- Only fire when status actually changes to 'confirmed'
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'confirmed' THEN RETURN NEW; END IF;
  -- client_id must exist (group appointments may not have one)
  IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

  v_title   := 'Cita confirmada';
  v_message := COALESCE(NEW.title, 'Tu cita') || ' fue confirmada.';
  IF NEW.start_time IS NOT NULL THEN
    v_message := v_message || ' Hora: ' ||
      to_char(NEW.start_time AT TIME ZONE 'America/Costa_Rica', 'DD/MM/YYYY HH24:MI');
  END IF;

  PERFORM public.enqueue_push_notification(
    NEW.client_id,
    NEW.tenant_id,
    'appointment_confirmed',
    'appointment',
    v_title,
    v_message,
    jsonb_build_object(
      'appointment_id', NEW.id::text,
      'title',          COALESCE(NEW.title, ''),
      'start_time',     COALESCE(NEW.start_time::text, '')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_push_appointment_confirmed ON public.appointments;

CREATE TRIGGER trg_notify_push_appointment_confirmed
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_push_appointment_confirmed();

-- ── 6. Trigger: appointment_created → push to client ────────────────────────
-- Fires on INSERT when status is 'pending_confirmation' or 'scheduled',
-- acknowledging that the appointment request was received.

DROP FUNCTION IF EXISTS public.trg_notify_push_appointment_created CASCADE;
CREATE OR REPLACE FUNCTION public.trg_notify_push_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title   TEXT;
  v_message TEXT;
BEGIN
  IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

  -- Only notify for statuses that mean "received / under review"
  IF NEW.status NOT IN ('pending_confirmation', 'scheduled', 'pending') THEN
    RETURN NEW;
  END IF;

  v_title   := 'Solicitud de cita recibida';
  v_message := 'Recibimos tu solicitud para ' ||
    COALESCE(NEW.title, 'una cita') || '. Te notificaremos cuando sea confirmada.';

  PERFORM public.enqueue_push_notification(
    NEW.client_id,
    NEW.tenant_id,
    'appointment_created',
    'appointment',
    v_title,
    v_message,
    jsonb_build_object(
      'appointment_id', NEW.id::text,
      'title',          COALESCE(NEW.title, ''),
      'start_time',     COALESCE(NEW.start_time::text, '')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_push_appointment_created ON public.appointments;

CREATE TRIGGER trg_notify_push_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_push_appointment_created();

-- ── 7. Trigger: appointment_cancelled → push to client ───────────────────────

DROP FUNCTION IF EXISTS public.trg_notify_push_appointment_cancelled CASCADE;
CREATE OR REPLACE FUNCTION public.trg_notify_push_appointment_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title   TEXT;
  v_message TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

  v_title   := 'Cita cancelada';
  v_message := COALESCE(NEW.title, 'Tu cita') || ' fue cancelada.';

  PERFORM public.enqueue_push_notification(
    NEW.client_id,
    NEW.tenant_id,
    'appointment_cancelled',
    'appointment',
    v_title,
    v_message,
    jsonb_build_object(
      'appointment_id', NEW.id::text,
      'title',          COALESCE(NEW.title, ''),
      'start_time',     COALESCE(NEW.start_time::text, '')
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_push_appointment_cancelled ON public.appointments;

CREATE TRIGGER trg_notify_push_appointment_cancelled
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_push_appointment_cancelled();

-- ── 8. Trigger: user_approved → push to client ───────────────────────────────
-- Fires when profiles.approval_status transitions from any state to 'approved'.
-- The email channel for this event is already handled by migration 089
-- (trigger_profile_approval_communication which calls send-communication).
-- This trigger adds the push channel.

DROP FUNCTION IF EXISTS public.trg_notify_push_user_approved CASCADE;
CREATE OR REPLACE FUNCTION public.trg_notify_push_user_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN RETURN NEW; END IF;
  IF NEW.approval_status <> 'approved' THEN RETURN NEW; END IF;

  PERFORM public.enqueue_push_notification(
    NEW.id,
    NEW.tenant_id,
    'user_approved',
    'account',
    '¡Bienvenido!',
    'Tu cuenta fue aprobada. Ya puedes acceder a todos los beneficios de tu membresía.',
    jsonb_build_object(
      'user_id', NEW.id::text
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_push_user_approved ON public.profiles;

CREATE TRIGGER trg_notify_push_user_approved
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_push_user_approved();

-- ── 9. Trigger: plan purchased (subscription becomes active) → push to client ─

DROP FUNCTION IF EXISTS public.trg_notify_push_plan_purchased CASCADE;
CREATE OR REPLACE FUNCTION public.trg_notify_push_plan_purchased()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name TEXT;
BEGIN
  -- Only fire when a new subscription is inserted as active,
  -- or when status transitions to active (manual admin assignment)
  IF TG_OP = 'UPDATE' AND (NEW.status IS NOT DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;

  -- Look up plan name for a friendlier message (best-effort)
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_push_plan_purchased_insert ON public.user_subscriptions;
DROP TRIGGER IF EXISTS trg_notify_push_plan_purchased_update ON public.user_subscriptions;

CREATE TRIGGER trg_notify_push_plan_purchased_insert
  AFTER INSERT ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_push_plan_purchased();

CREATE TRIGGER trg_notify_push_plan_purchased_update
  AFTER UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_push_plan_purchased();

-- ── 10. check_expiring_subscriptions() — helper for expire-plan-subscriptions ─
-- Returns subscriptions expiring within the next `p_days` days (default: 3).
-- The Edge Function calls this via supabase.rpc('check_expiring_subscriptions')
-- and then queues notifications for each returned row.
-- Also inserts push rows into notification_queue as a side-effect so the
-- mobile app can surface them without a second round-trip.

DROP FUNCTION IF EXISTS public.check_expiring_subscriptions CASCADE;
CREATE OR REPLACE FUNCTION public.check_expiring_subscriptions(
  p_days INT DEFAULT 3
)
RETURNS TABLE (
  subscription_id UUID,
  user_id         UUID,
  tenant_id       UUID,
  plan_name       TEXT,
  end_date        DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      us.id        AS subscription_id,
      us.user_id,
      us.tenant_id,
      pl.name      AS plan_name,
      us.end_date::DATE
    FROM  public.user_subscriptions us
    JOIN  public.plans pl ON pl.id = us.plan_id
    WHERE us.status   = 'active'
      AND us.end_date IS NOT NULL
      AND us.end_date BETWEEN NOW()
                          AND NOW() + (p_days || ' days')::INTERVAL
      -- Skip if an expiry push was already queued in the last 22 hours
      AND NOT EXISTS (
        SELECT 1
          FROM public.notification_queue nq
         WHERE nq.user_id    = us.user_id
           AND nq.event_type = 'subscription_expiring'
           AND nq.created_at > NOW() - INTERVAL '22 hours'
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_expiring_subscriptions(INT) TO service_role;

-- ── 11. enqueue_expiring_subscription_pushes() ───────────────────────────────
-- Called by the expire-plan-subscriptions Edge Function (or a pg_cron job)
-- to bulk-insert push notifications for subscriptions expiring in p_days days.
-- Returns the count of notifications queued.

DROP FUNCTION IF EXISTS public.enqueue_expiring_subscription_pushes CASCADE;
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
      NULL; -- Skip individual failures
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_expiring_subscription_pushes(INT) TO service_role;

-- ── 12. process_notification_queue() — batch processor ───────────────────────
-- Called by a cron job or the notify-push Edge Function to dequeue and
-- forward pending push notifications to the notify-push Edge Function via pg_net.
-- Marks rows as 'processing' first (advisory lock pattern) to prevent
-- double-processing under concurrent runs.

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
  -- Claim a batch atomically (SKIP LOCKED prevents concurrent double-processing)
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

  -- Fire a single batched HTTP call to notify-push with all claimed rows
  -- notify-push accepts { notifications: [{user_id, title, message, type}] }
  PERFORM net.http_post(
    url     := 'https://wzvhxkleswlzzobxtmfv.supabase.co/functions/v1/notify-push',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', v_secret
    ),
    body    := (
      SELECT jsonb_build_object(
        'notifications',
        jsonb_agg(
          jsonb_build_object(
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

  -- Mark all claimed rows as sent
  UPDATE public.notification_queue
     SET status       = 'sent',
         processed_at = NOW()
   WHERE id = ANY(v_ids);

  v_count := array_length(v_ids, 1);
  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  -- On failure, reset to pending so the next run can retry
  UPDATE public.notification_queue
     SET status      = 'pending',
         retry_count = retry_count + 1,
         error_msg   = SQLERRM
   WHERE id = ANY(v_ids);
  RETURN 0;
END;
$$;

REVOKE ALL  ON FUNCTION public.process_notification_queue(INT) FROM PUBLIC;
REVOKE ALL  ON FUNCTION public.process_notification_queue(INT) FROM anon;
REVOKE ALL  ON FUNCTION public.process_notification_queue(INT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.process_notification_queue(INT) TO service_role;

-- ── 13. Schedule the queue processor every 5 minutes via pg_cron ─────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-notification-queue') THEN
    PERFORM cron.unschedule('process-notification-queue');
  END IF;
END $$;

SELECT cron.schedule(
  'process-notification-queue',
  '*/5 * * * *',
  $$SELECT public.process_notification_queue(50)$$
);

-- ── 14. Grant table access to service_role (bypasses RLS already, but
--         explicit grants are good practice for audit clarity) ─────────────────
GRANT SELECT, INSERT, UPDATE ON public.notification_queue TO service_role;
