import { getSessionData } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { CorrespondenciaClient } from '@/components/admin/correspondencia-client'

export const metadata = { title: 'Correspondencia' }

export default async function CorrespondenciaPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')
  const { supabase, tenantId } = session

  const { data: canManage } = await supabase.rpc('has_permission', {
    permission_code: 'tenant.manage_correspondence',
  })
  if (!canManage) redirect('/admin/dashboard')

  const [rulesResult, templatesResult, smtpResult, whatsappTemplatesResult] = await Promise.all([
    supabase
      .from('communication_rules')
      .select('id, name, event_type, recipients, delay_minutes, is_active, channel, template_id, email_templates(name), whatsapp_template_id, whatsapp_templates(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('email_templates')
      .select('id, name, subject, body_html, variables, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('smtp_configs')
      .select('*')
      .maybeSingle(),
    supabase
      .from('whatsapp_templates')
      .select('id, name, body_text, variables, created_at')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Correspondencia"
        subtitle="Gestiona plantillas de email y reglas de envío automático"
      />
      <CorrespondenciaClient
        rules={rulesResult.data ?? []}
        templates={templatesResult.data ?? []}
        whatsappTemplates={whatsappTemplatesResult.data ?? []}
        smtpConfig={smtpResult.data ?? null}
        tenantId={tenantId}
      />
    </div>
  )
}
