-- ============================================================
-- Migration 000072: Fix create_client_subscription
--
-- Problem 1: ON CONFLICT (payment_reference) requires a non-partial
--   unique index. The current index is partial (WHERE NOT NULL), which
--   PostgreSQL won't match. Replace with a full unique index — NULLs
--   are always considered distinct in PostgreSQL so this is safe.
--
-- Problem 2: GRANT was only to service_role. The success page now calls
--   the function via the authenticated (session) client, not admin.
-- ============================================================

-- ── 1. Replace partial unique index with a full unique index ─────
DROP INDEX IF EXISTS public.idx_user_subscriptions_payment_ref;

CREATE UNIQUE INDEX idx_user_subscriptions_payment_ref
  ON public.user_subscriptions(payment_reference);

-- ── 2. Grant execute to the authenticated role ───────────────────
GRANT EXECUTE ON FUNCTION public.create_client_subscription(
  UUID, UUID, UUID, UUID, NUMERIC, TEXT, TEXT
) TO authenticated;
