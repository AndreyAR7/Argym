import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ShieldCheck } from 'lucide-react'
import { MedicalDataClient } from './medical-data-client'

export const metadata = { title: 'Ficha médica' }

export default async function ClientMedicalDataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: record } = await supabase
    .from('client_medical_records')
    .select('*')
    .eq('client_id', user.id)
    .maybeSingle()

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <PageHeader title="Ficha médica" subtitle="Información privada, visible solo para ti y el equipo del gimnasio" />

      <div className="mt-4 mb-6 flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)' }}>
        <ShieldCheck size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
        <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
          Esta información ayuda a tu coach a entrenarte de forma segura y es necesaria para la protección legal
          del gimnasio ante emergencias. Solo tú, tu coach y el administrador pueden verla.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <MedicalDataClient record={record} />
      </div>
    </div>
  )
}
