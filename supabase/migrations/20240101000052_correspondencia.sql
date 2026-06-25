-- ============================================================
-- Migration 000052: Correspondencia (Communications) Module
--
-- Tables: smtp_configs, email_templates, communication_rules
-- All scoped to tenant, admin-only write access.
-- ============================================================

-- ── 1. SMTP configuration per tenant ──────────────────────────
CREATE TABLE IF NOT EXISTS public.smtp_configs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  host         TEXT        NOT NULL DEFAULT '',
  port         INT         NOT NULL DEFAULT 587,
  username     TEXT        NOT NULL DEFAULT '',
  password     TEXT        NOT NULL DEFAULT '',
  from_email   TEXT        NOT NULL DEFAULT '',
  from_name    TEXT        NOT NULL DEFAULT '',
  use_tls      BOOLEAN     NOT NULL DEFAULT TRUE,
  is_active    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- ── 2. Email templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  subject     TEXT        NOT NULL,
  body_html   TEXT        NOT NULL DEFAULT '',
  variables   TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Communication rules ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_rules (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  event_type   TEXT        NOT NULL
    CHECK (event_type IN (
      'appointment.created',
      'appointment.confirmed',
      'appointment.cancelled',
      'appointment.reminder',
      'plan.purchased',
      'plan.expiring',
      'plan.expired',
      'promotion.used',
      'client.approved',
      'client.welcome'
    )),
  template_id  UUID        REFERENCES public.email_templates(id) ON DELETE SET NULL,
  recipients   TEXT        NOT NULL DEFAULT 'client'
    CHECK (recipients IN ('client', 'coach', 'admin', 'client_and_coach', 'all')),
  delay_minutes INT        NOT NULL DEFAULT 0, -- 0 = immediate, >0 = delayed
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Log of sent emails (for future use) ─────────────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id      UUID        REFERENCES public.communication_rules(id) ON DELETE SET NULL,
  template_id  UUID        REFERENCES public.email_templates(id) ON DELETE SET NULL,
  to_email     TEXT        NOT NULL,
  subject      TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_msg    TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_smtp_configs_tenant     ON public.smtp_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant  ON public.email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_rules_tenant       ON public.communication_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comm_rules_event        ON public.communication_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant       ON public.email_logs(tenant_id);

-- ── 6. RLS ─────────────────────────────────────────────────────
ALTER TABLE public.smtp_configs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs            ENABLE ROW LEVEL SECURITY;

-- Admin: full access within tenant
CREATE POLICY "smtp_configs_admin_all" ON public.smtp_configs
  FOR ALL USING (tenant_id = public.get_tenant_id());

CREATE POLICY "email_templates_admin_all" ON public.email_templates
  FOR ALL USING (tenant_id = public.get_tenant_id());

CREATE POLICY "comm_rules_admin_all" ON public.communication_rules
  FOR ALL USING (tenant_id = public.get_tenant_id());

CREATE POLICY "email_logs_admin_read" ON public.email_logs
  FOR SELECT USING (tenant_id = public.get_tenant_id());

-- ── 7. updated_at triggers ─────────────────────────────────────
CREATE TRIGGER smtp_configs_updated_at
  BEFORE UPDATE ON public.smtp_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER comm_rules_updated_at
  BEFORE UPDATE ON public.communication_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
