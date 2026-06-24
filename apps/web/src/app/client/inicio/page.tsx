import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Dumbbell, Video, CalendarDays, Apple } from 'lucide-react'

export const metadata = { title: 'Inicio' }

export default async function ClientHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const [
    { count: routineCount },
    { count: videoCount },
    { count: appointmentCount },
  ] = await Promise.all([
    supabase
      .from('routine_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id),
    supabase
      .from('video_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', user!.id)
      .eq('status', 'scheduled'),
  ])

  const { data: activeSub } = await supabase
    .from('user_subscriptions')
    .select('status, plans(name)')
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  const planName = (activeSub as any)?.plans?.name

  return (
    <div className="p-8">
      <PageHeader
        title={`Bienvenido, ${profile?.full_name?.split(' ')[0] ?? ''}`}
        subtitle={planName ? `Plan activo: ${planName}` : 'Sin plan activo'}
      />

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Rutinas asignadas"
          value={routineCount ?? 0}
          icon={<Dumbbell size={18} />}
          accentClass="text-[var(--color-client)]"
          href="/client/routine"
        />
        <StatCard
          label="Videos disponibles"
          value={videoCount ?? 0}
          icon={<Video size={18} />}
          accentClass="text-[var(--color-admin)]"
          href="/client/videos"
        />
        <StatCard
          label="Próximas citas"
          value={appointmentCount ?? 0}
          icon={<CalendarDays size={18} />}
          accentClass="text-[var(--color-coach)]"
          href="/client/appointments"
        />
        <StatCard
          label="Plan de nutrición"
          value="Ver"
          icon={<Apple size={18} />}
          accentClass="text-[var(--color-coach)]"
          href="/client/nutrition"
        />
      </div>
    </div>
  )
}
