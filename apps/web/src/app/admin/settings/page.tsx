import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { SettingsForm } from '@/components/admin/settings-form'

export const metadata = { title: 'Ajustes' }

const TIMEZONES = [
  { value: 'America/Costa_Rica', label: 'América/Costa Rica (GMT-6)' },
  { value: 'America/Mexico_City', label: 'América/Ciudad de México (GMT-6)' },
  { value: 'America/Bogota', label: 'América/Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'América/Lima (GMT-5)' },
  { value: 'America/Santiago', label: 'América/Santiago (GMT-3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'América/Buenos Aires (GMT-3)' },
  { value: 'America/New_York', label: 'América/Nueva York (GMT-5)' },
  { value: 'America/Chicago', label: 'América/Chicago (GMT-6)' },
  { value: 'America/Los_Angeles', label: 'América/Los Ángeles (GMT-8)' },
  { value: 'Europe/Madrid', label: 'Europa/Madrid (GMT+1)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
]

export default async function SettingsPage() {
  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, timezone, currency, locale, logo_url, is_active, created_at')
    .eq('id', tenantId)
    .single()

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <PageHeader
        title="Ajustes del negocio"
        subtitle="Configura la información de tu gimnasio"
      />

      <div className="mt-8">
        <SettingsForm tenant={tenant!} timezones={TIMEZONES} />
      </div>
    </div>
  )
}
