import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar } from '@/components/ui/avatar'
import { AppointmentStatusSelect } from '@/components/admin/appointment-status-select'
import { NewAppointmentButton } from '@/components/admin/new-appointment-button'
import { AppointmentsCalendar } from '@/components/admin/appointments-calendar'
import { CalendarDays, LayoutList, MapPin, Video, Phone } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Citas' }

const STATUS_TABS = [
  { value: 'all',       label: 'Todas' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
]

const TYPE_ICONS: Record<string, React.ReactNode> = {
  in_person: <MapPin size={12} />,
  virtual:   <Video size={12} />,
  phone:     <Phone size={12} />,
}

const TYPE_LABELS: Record<string, string> = {
  in_person: 'Presencial',
  virtual:   'Virtual',
  phone:     'Teléfono',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit' }).format(d)
  return { date, time }
}

function getWeekStart(weekParam?: string): Date {
  if (weekParam) {
    // Append T00:00:00 so JavaScript parses it as local time, not UTC midnight
    const d = new Date(`${weekParam}T00:00:00`)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; view?: string; week?: string }>
}) {
  const params = await searchParams
  const statusFilter = params.status ?? 'all'
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const view = params.view ?? 'list'
  const PAGE_SIZE = 30

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const weekStart = getWeekStart(params.week)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  let listQuery = supabase
    .from('appointments')
    .select(`
      id, title, description, start_time, end_time,
      status, appointment_type, location, meeting_url,
      client:profiles!client_id(full_name, avatar_url),
      coach:profiles!coach_id(full_name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  if (statusFilter !== 'all') listQuery = listQuery.eq('status', statusFilter)

  const calendarQuery = supabase
    .from('appointments')
    .select(`
      id, title, start_time, end_time, status, appointment_type,
      client:profiles!client_id(full_name, avatar_url),
      coach:profiles!coach_id(full_name)
    `)
    .eq('tenant_id', tenantId)
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString())
    .order('start_time', { ascending: true })

  const [coachResult, clientResult, appointmentsResult] = await Promise.all([
    supabase.rpc('get_profiles_by_role', { role_name: 'coach' }),
    supabase.rpc('get_profiles_by_role', { role_name: 'client' }),
    view === 'calendar' ? calendarQuery : listQuery,
  ])

  const coachList = coachResult.data ?? []
  const clientList = clientResult.data ?? []
  const appointments = (appointmentsResult.data ?? []) as any[]
  const count = (appointmentsResult as any).count as number | null
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function buildUrl(s?: string, p?: number) {
    const sp = new URLSearchParams()
    const st = s ?? statusFilter; const pg = p ?? page
    if (st !== 'all') sp.set('status', st)
    if (pg > 1) sp.set('page', String(pg))
    return `/admin/appointments${sp.toString() ? `?${sp.toString()}` : ''}`
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Citas"
        subtitle={view === 'calendar'
          ? `Semana del ${localDateStr(weekStart)}`
          : `${count ?? 0} cita${count !== 1 ? 's' : ''} registradas`}
      >
        {/* View toggle */}
        <div className="flex items-center gap-0 rounded-lg border border-[var(--color-border)] overflow-hidden">
          <Link href="/admin/appointments"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              view !== 'calendar' ? 'bg-[var(--color-admin)] text-white' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            <LayoutList size={13} />Lista
          </Link>
          <Link href="/admin/appointments?view=calendar"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'calendar' ? 'bg-[var(--color-admin)] text-white' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            <CalendarDays size={13} />Calendario
          </Link>
        </div>
        <NewAppointmentButton coaches={coachList} clients={clientList} />
      </PageHeader>

      {view === 'calendar' ? (
        <AppointmentsCalendar
          appointments={appointments}
          coaches={coachList}
          clients={clientList}
          weekStart={localDateStr(weekStart)}
        />
      ) : (
        <>
          <div className="mt-6 flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <Link key={tab.value} href={buildUrl(tab.value, 1)}
                className={`px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  statusFilter === tab.value
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {!appointments || appointments.length === 0 ? (
            <div className="mt-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center">
                <CalendarDays size={24} className="text-[var(--color-border)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">No hay citas</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {statusFilter !== 'all' ? 'No hay citas con este estado.' : 'Crea la primera cita con el botón de arriba.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Cita</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Coach</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
                    {appointments.map((apt) => {
                      const { date, time } = formatDateTime(apt.start_time)
                      return (
                        <tr key={apt.id} className="hover:bg-[var(--color-muted)] transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[var(--color-foreground)] line-clamp-1">{apt.title}</p>
                            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 tabular-nums">{date} · {time}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={apt.client?.full_name ?? '?'} src={apt.client?.avatar_url ?? null} size="sm" />
                              <span className="text-sm text-[var(--color-foreground)]">{apt.client?.full_name ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-sm text-[var(--color-muted-foreground)]">
                            {apt.coach?.full_name ?? <span className="italic">Sin asignar</span>}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                              {TYPE_ICONS[apt.appointment_type]}
                              {TYPE_LABELS[apt.appointment_type] ?? apt.appointment_type}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <AppointmentStatusSelect appointmentId={apt.id} initialStatus={apt.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-[var(--color-muted-foreground)]">{count} citas · página {page} de {totalPages}</p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link href={buildUrl(undefined, page - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors">
                        ← Anterior
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link href={buildUrl(undefined, page + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors">
                        Siguiente →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
