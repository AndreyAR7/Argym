-- ============================================================
-- Migration 000149: Stripe webhook event idempotency
--
-- Stripe delivers webhooks at-least-once and explicitly documents that
-- the same event.id can arrive more than once (retries, redelivery from
-- the dashboard, etc.). Most cases in
-- apps/web/src/app/api/stripe/webhook/route.ts are naturally idempotent
-- because the RPCs they call are (create_client_subscription has
-- ON CONFLICT (payment_reference), cancel/renew re-apply the same
-- state) — but invoice.payment_failed just re-sends the customer-facing
-- "payment failed" email every single time the event is redelivered,
-- with no dedup at all.
--
-- Fix at the root instead of one case at a time: track processed
-- event.id and skip the whole switch on a repeat delivery.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id     TEXT        PRIMARY KEY,
  event_type   TEXT        NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role client (webhook routes, which bypass
-- RLS entirely) ever touches this table.
