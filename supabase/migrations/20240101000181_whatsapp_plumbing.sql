-- WhatsApp channel plumbing — no Meta Business account/credentials exist
-- yet (user doesn't have one), so this ships fully wired but gated: once
-- WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are set as edge function
-- secrets, sending starts working with zero further schema/UI changes.
-- Until then, every whatsapp-channel rule visibly logs
-- "WhatsApp no configurado" per attempt instead of silently doing nothing.

ALTER TABLE public.communication_rules
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'whatsapp'));

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  body_text   TEXT        NOT NULL DEFAULT '',
  variables   TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.communication_rules
  ADD COLUMN IF NOT EXISTS whatsapp_template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id      UUID        REFERENCES public.communication_rules(id) ON DELETE SET NULL,
  template_id  UUID        REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  to_phone     TEXT        NOT NULL,
  message      TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'not_configured')),
  error_msg    TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant ON public.whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_tenant       ON public.whatsapp_logs(tenant_id);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs      ENABLE ROW LEVEL SECURITY;

-- Same gate as email_templates/communication_rules (000170): only
-- full_access (and platform admins via the built-in bypass) may manage
-- WhatsApp templates.
CREATE POLICY "whatsapp_templates_admin_all" ON public.whatsapp_templates
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_correspondence'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_correspondence'));

-- Same read shape as email_logs_admin_read (000052) — kept identical on
-- purpose rather than tightened, so the two log tables behave the same
-- way for the same caller.
CREATE POLICY "whatsapp_logs_admin_read" ON public.whatsapp_logs
  FOR SELECT USING (tenant_id = public.get_tenant_id());

CREATE TRIGGER whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
