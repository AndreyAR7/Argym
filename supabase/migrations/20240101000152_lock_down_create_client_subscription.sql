-- ============================================================
-- Migration 000152: create_client_subscription must not be callable
-- by an authenticated client directly
--
-- This RPC is meant to run only after a real Stripe payment — either
-- from the webhook (service_role) or from the /client/planes/success
-- page's fallback path, which independently verifies the real Stripe
-- checkout session (payment_status === 'paid') before calling it. But
-- it was GRANTed to `authenticated` too, and the function itself never
-- validates p_payment_ref against Stripe — the only self-protection is
-- a guard against creating a subscription for someone ELSE, not
-- against fabricating one for yourself. Any authenticated client could
-- call it directly with a made-up payment_ref and price and receive an
-- 'active' subscription plus a matching 'paid' invoice — and since the
-- physical check-in RPC only checks
-- `user_subscriptions.status = 'active' AND plans.grants_physical_access`
-- with no idea how that row was created, this wasn't just a fake UI
-- state, it was free real-world gym access.
--
-- Fix: restrict execution to service_role only. The success page's
-- fallback (which already does the real Stripe verification) now goes
-- through the admin/service-role client instead of the user's own
-- session — see apps/web/src/app/client/planes/success/page.tsx.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.create_client_subscription(UUID, UUID, UUID, UUID, NUMERIC, TEXT, TEXT)
  FROM authenticated;
