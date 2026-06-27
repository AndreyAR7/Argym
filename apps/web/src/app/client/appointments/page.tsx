import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ClientAppointmentsCalendar } from '@/components/client/appointments-calendar'
import { ClientAppointmentsList } from '@/components/client/client-appointments-list'
import { CalendarDays, LayoutList } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Mis Citas' }

function getWeekStart(weekParam?: string): Date {
  if (weekParam) {
    const d = new Date(`${weekParam}T00:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  const d   = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function ClientAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const view   = params.view ?? 'list'

  const weekStart = getWeekStart(params.week)
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  // For calendar view fetch only the current week; for list view fetch all
  const query = supabase
    .from('appointments')
    .select('id, title, start_time, end_time, status, appointment_type, notes, location, meeting_url, coach:profiles!appointments_coach_id_fkey(full_name)')
    .eq('client_id', user.id)

  const { data: appointments } = view === 'calendar'
    ? await query
        .gte('start_time', weekStart.toISOString())
        .lt('start_time', weekEnd.toISOString())
        .order('start_time')
    : await query.order('start_time', { ascending: false })

  // Supabase returns foreign-key joins as arrays; normalize to object | null
  const all = (appointments ?? []).map((a: any) => ({
    ...a,
    coach: Array.isArray(a.coach) ? (a.coach[0] ?? null) : a.coach,
  }))
  const upcoming = all.filter((a: any) => ['scheduled', 'confirmed'].includes(a.status))
  const past     = all.filter((a: any) => !['scheduled', 'confirmed'].includes(a.status))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Mis Citas"
        subtitle={view === 'calendar'
          ? `Semana del ${localDateStr(weekStart)}`
          : `${all.length} cita${all.length !== 1 ? 's' : ''} en total`}
      >
        {/* View toggle */}
        <div className="flex items-center gap-0 rounded-lg border border-[var(--color-border)] overflow-hidden">
          <Link
            href="/client/appointments"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              view !== 'calendar'
                ? 'bg-[var(--color-client)] text-white'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            <LayoutList size={13} />Lista
          </Link>
          <Link
            href="/client/appointments?view=calendar"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'calendar'
                ? 'bg-[var(--color-client)] text-white'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            <CalendarDays size={13} />Calendario
          </Link>
        </div>
      </PageHeader>

      {view === 'calendar' ? (
        <ClientAppointmentsCalendar
          appointments={all}
          weekStart={localDateStr(weekStart)}
        />
      ) : (
        <ClientAppointmentsList upcoming={upcoming} past={past} />
      )}
    </div>
  )
}
