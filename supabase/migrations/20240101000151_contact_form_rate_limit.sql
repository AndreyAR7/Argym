-- ============================================================
-- Migration 000151: Rate-limit the public contact form
--
-- contact-us only validated length/format — no rate limit of any kind.
-- A flood (scripted or just a bot finding the endpoint) sends through the
-- platform's own dedicated Gmail account, which Google will throttle or
-- suspend outright for sending abuse, taking down the contact form for
-- everyone. A CAPTCHA would need a third-party key the deploying team has
-- to provision; this covers the actually-preventable part now — both a
-- per-IP cap and a global circuit breaker (a distributed flood spread
-- across many IPs would sail under any single-IP limit but still exhaust
-- the same Gmail account).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_form_submissions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_ip
  ON public.contact_form_submissions (ip, created_at);
CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_created
  ON public.contact_form_submissions (created_at);

ALTER TABLE public.contact_form_submissions ENABLE ROW LEVEL SECURITY;
-- No policies: only the contact-us Edge Function (service role) touches this.
