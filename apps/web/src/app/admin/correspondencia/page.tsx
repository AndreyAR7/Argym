import { getSessionData } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { CorrespondenciaClient } from '@/components/admin/correspondencia-client'

export const metadata = { title: 'Correspondencia' }

export default async function CorrespondenciaPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')
  const { supabase, tenantId } = session

  const [rulesResult, templatesResult, smtpResult] = await Promise.all([
    supabase
      .from('communication_rules')
      .select('id, name, event_type, recipients, delay_minutes, is_active, template_id, email_templates(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('email_templates')
      .select('id, name, subject, body_html, variables, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('smtp_configs')
      .select('*')
      .maybeSingle(),
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
        smtpConfig={smtpResult.data ?? null}
        tenantId={tenantId}
      />
    </div>
  )
}
