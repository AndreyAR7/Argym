import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ClientAppointmentsCalendar } from '@/components/client/appointments-calendar'
import { CalendarDays, Clock, LayoutList, User } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Mis Citas' }

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Programada', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  confirmed:  { label: 'Confirmada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:  { label: 'Completada', cls: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]' },
  cancelled:  { label: 'Cancelada',  cls: 'bg-red-50 text-red-700 border-red-200' },
  no_show:    { label: 'No asistió', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

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
    .select('id, title, start_time, end_time, status, appointment_type, notes, coach:profiles!appointments_coach_id_fkey(full_name)')
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

  function AppointmentCard({ appt }: { appt: any }) {
    const status = STATUS_CONFIG[appt.status] ?? { label: appt.status, cls: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]' }
    const start  = new Date(appt.start_time)
    const end    = appt.end_time ? new Date(appt.end_time) : null
    return (
      <div className="flex items-start gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-client-light)] flex flex-col items-center justify-center flex-shrink-0 text-[var(--color-client)]">
          <span className="text-[10px] font-bold uppercase">
            {start.toLocaleString('es-CR', { month: 'short' })}
          </span>
          <span className="text-base font-bold leading-none">{start.getDate()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="font-medium text-[var(--color-foreground)]">{appt.title || 'Cita'}</p>
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
              <Clock size={11} />
              {start.toLocaleString('es-CR', { hour: '2-digit', minute: '2-digit' })}
              {end && ` – ${end.toLocaleString('es-CR', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
            {appt.coach?.full_name && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                <User size={11} />
                {appt.coach.full_name}
              </span>
            )}
          </div>
          {appt.notes && <p className="text-xs text-[var(--color-muted-foreground)] mt-1 italic">{appt.notes}</p>}
        </div>
      </div>
    )
  }

  const totalForHeader = view === 'list' ? all.length : undefined

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
        <>
          {all.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
                <CalendarDays size={20} className="text-[var(--color-border)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">Sin citas</p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Tu coach agendará citas contigo pronto.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {upcoming.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">
                    Próximas
                  </h2>
                  <div className="space-y-3">
                    {upcoming.map((a: any) => <AppointmentCard key={a.id} appt={a} />)}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">
                    Historial
                  </h2>
                  <div className="space-y-3 opacity-75">
                    {past.map((a: any) => <AppointmentCard key={a.id} appt={a} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
