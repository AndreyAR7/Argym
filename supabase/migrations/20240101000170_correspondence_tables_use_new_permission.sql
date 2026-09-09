-- communication_rules/email_templates/smtp_configs were gated on
-- has_permission('settings.manage') — a permission no role currently holds,
-- so only a platform admin (which bypasses has_permission entirely) could
-- ever write to these tables. Point them at the new
-- tenant.manage_correspondence permission instead, granted only to
-- full_access, so that role (and platform admins, still via the built-in
-- bypass) can actually manage correspondence, while plain admin — which
-- never had working write access here anyway — stays excluded.

DROP POLICY IF EXISTS "communication_rules_admin_all" ON public.communication_rules;
CREATE POLICY "communication_rules_admin_all" ON public.communication_rules
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_correspondence'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_correspondence'));

DROP POLICY IF EXISTS "email_templates_admin_all" ON public.email_templates;
CREATE POLICY "email_templates_admin_all" ON public.email_templates
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_correspondence'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_correspondence'));

DROP POLICY IF EXISTS "smtp_configs_admin_all" ON public.smtp_configs;
CREATE POLICY "smtp_configs_admin_all" ON public.smtp_configs
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_correspondence'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_correspondence'));
