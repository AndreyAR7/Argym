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
  { value: 'all',       label: 'Todas'       },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas'  },
]

const TYPE_ICONS: Record<string, React.ReactNode> = {
  in_person: <MapPin size={12} />,
  virtual:   <Video  size={12} />,
  phone:     <Phone  size={12} />,
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
  const page        = Math.max(1, parseInt(params.page ?? '1'))
  const view        = params.view ?? 'list'
  const PAGE_SIZE   = 30

  const session = await getSessionData()
  const { supabase, user } = session!

  const weekStart = getWeekStart(params.week)
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const [coachResult, clientResult, appointmentsResult] = await Promise.all([
    supabase.rpc('get_profiles_by_role', { role_name: 'coach' }),
    supabase.rpc('get_profiles_by_role', { role_name: 'client' }),
    // SECURITY DEFINER RPC — bypasses RLS issues with user_roles subquery
    view === 'calendar'
      ? supabase.rpc('list_appointments', {
          p_start_time: weekStart.toISOString(),
          p_end_time:   weekEnd.toISOString(),
        })
      : supabase.rpc('list_appointments'),
  ])

  if (appointmentsResult.error) {
    console.error('[APPTS PAGE] list_appointments error:', appointmentsResult.error)
  }

  const coachList  = coachResult.data  ?? []
  const clientList = clientResult.data ?? []

  // Normalize flat RPC response → shape expected by child components
  const rawApts = (appointmentsResult.data ?? []) as Array<{
    id: string; title: string; description: string | null
    start_time: string; end_time: string; status: string
    appointment_type: string; location: string | null; meeting_url: string | null
    group_mode: string; coach_id: string | null; coach_name: string | null
    client_id: string | null; client_name: string | null; client_avatar: string | null
    participants: Array<{ id: string; full_name: string; avatar_url: string | null }>
  }>

  const normalizedApts = rawApts.map(a => ({
    ...a,
    client: a.client_id ? { full_name: a.client_name ?? '', avatar_url: a.client_avatar ?? null } : null,
    coach:  a.coach_id  ? { full_name: a.coach_name  ?? '' }                                       : null,
  }))

  // Client-side status filter + pagination (works with any volume a gym would have)
  const filtered   = statusFilter === 'all' ? normalizedApts : normalizedApts.filter(a => a.status === statusFilter)
  const count      = filtered.length
  const totalPages = Math.ceil(count / PAGE_SIZE)
  const appointments = view === 'calendar'
    ? normalizedApts  // calendar already filtered by date in RPC
    : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
          : `${count} cita${count !== 1 ? 's' : ''} registradas`}
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
        <NewAppointmentButton coaches={coachList} clients={clientList} currentUserId={user.id} />
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
          {/* Status tabs */}
          <div className="mt-6 flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <Link key={tab.value} href={buildUrl(tab.value, 1)}
                className={`px-3.5 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  statusFilter === tab.value
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {appointments.length === 0 ? (
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Clientes</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Coach</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
                    {appointments.map((apt) => {
                      const { date, time } = formatDateTime(apt.start_time)
                      // Show participant list if group appointment, else primary client
                      const displayClients: Array<{ full_name: string; avatar_url: string | null }> =
                        apt.group_mode === 'group' && apt.participants.length > 0
                          ? apt.participants.map(p => ({ full_name: p.full_name, avatar_url: p.avatar_url }))
                          : apt.client ? [{ full_name: apt.client.full_name, avatar_url: apt.client.avatar_url }] : []

                      return (
                        <tr key={apt.id} className="hover:bg-[var(--color-muted)] transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[var(--color-foreground)] line-clamp-1">{apt.title}</p>
                            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 tabular-nums">{date} · {time}</p>
                          </td>
                          <td className="px-4 py-3">
                            {displayClients.length === 0 ? (
                              <span className="text-sm text-[var(--color-muted-foreground)] italic">Sin cliente</span>
                            ) : displayClients.length === 1 ? (
                              <div className="flex items-center gap-2.5">
                                <Avatar name={displayClients[0].full_name} src={displayClients[0].avatar_url} size="sm" />
                                <span className="text-sm text-[var(--color-foreground)]">{displayClients[0].full_name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-2">
                                  {displayClients.slice(0, 3).map((c, i) => (
                                    <Avatar key={i} name={c.full_name} src={c.avatar_url} size="sm" />
                                  ))}
                                </div>
                                <span className="text-xs text-[var(--color-muted-foreground)]">
                                  {displayClients.length} clientes
                                </span>
                              </div>
                            )}
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
