import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Users, CalendarDays, Dumbbell } from 'lucide-react'

export const metadata = { title: 'Mi Panel' }

export default async function CoachHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const [
    { count: pendingAppointments },
    { count: upcomingAppointments },
    { count: routineCount },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user!.id)
      .eq('status', 'scheduled'),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user!.id)
      .gte('start_time', new Date().toISOString()),
    supabase
      .from('routines')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user!.id),
  ])

  return (
    <div className="p-8">
      <PageHeader
        title={`Hola, ${profile?.full_name?.split(' ')[0] ?? 'Coach'}`}
        subtitle="Aquí está el resumen de tu actividad"
      />

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Citas pendientes"
          value={pendingAppointments ?? 0}
          icon={<CalendarDays size={18} />}
          accentClass="text-[var(--color-coach)]"
          href="/coach/appointments"
        />
        <StatCard
          label="Próximas citas"
          value={upcomingAppointments ?? 0}
          icon={<Users size={18} />}
          accentClass="text-[var(--color-client)]"
          href="/coach/appointments"
        />
        <StatCard
          label="Rutinas creadas"
          value={routineCount ?? 0}
          icon={<Dumbbell size={18} />}
          accentClass="text-[var(--color-admin)]"
          href="/coach/routines"
        />
      </div>
    </div>
  )
}
