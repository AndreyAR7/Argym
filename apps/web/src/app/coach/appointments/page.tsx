import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { SearchInput } from '@/components/shared/search-input'
import { Pagination } from '@/components/shared/pagination'
import { CoachNewAppointmentButton } from '@/components/coach/coach-new-appointment-button'
import { CoachAppointmentsCalendar } from '@/components/coach/coach-appointments-calendar'
import { CalendarDays, LayoutList, MapPin, Video, Phone } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Mis Citas' }

const STATUS_TABS = [
  { value: 'all',                  label: 'Todas'       },
  { value: 'pending_confirmation', label: 'Pendientes'  },
  { value: 'scheduled',            label: 'Programadas' },
  { value: 'confirmed',            label: 'Confirmadas' },
  { value: 'completed',            label: 'Completadas' },
  { value: 'cancelled',            label: 'Canceladas'  },
]

const TYPE_ICON: Record<string, React.ReactNode> = {
  in_person: <MapPin size={13} />,
  virtual:   <Video  size={13} />,
  phone:     <Phone  size={13} />,
}

const TYPE_LABEL: Record<string, string> = {
  in_person: 'Presencial',
  virtual:   'Virtual',
  phone:     'Teléfono',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
  }
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

export default async function CoachAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; view?: string; week?: string }>
}) {
  const params = await searchParams
  const statusFilter = params.status ?? 'all'
  const q     = params.q ?? ''
  const page  = Math.max(1, parseInt(params.page ?? '1'))
  const view  = params.view ?? 'list'
  const PAGE_SIZE = 20

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const weekStart = getWeekStart(params.week)
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const [appointmentsResult, profileResult, clientsResult, calendarResult] = await Promise.all([
    (() => {
      let q = supabase
        .from('appointments')
        .select('id, title, start_time, end_time, status, appointment_type, location, meeting_url, notes, client_id', { count: 'exact' })
        .eq('coach_id', user!.id)
        .order('start_time', { ascending: false })
      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      return q
    })(),
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.rpc('get_profiles_by_role', { role_name: 'client' }),
    view === 'calendar'
      ? supabase.rpc('list_appointments', {
          p_start_time: weekStart.toISOString(),
          p_end_time: weekEnd.toISOString(),
          p_include_other_coaches: true,
        })
      : Promise.resolve({ data: null, error: null }),
  ])

  const { data: appointments, count } = appointmentsResult
  const coachName = profileResult.data?.full_name ?? ''
  const clientList = (clientsResult.data ?? []) as { id: string; full_name: string }[]
  // list_appointments scopes to the caller (coach_id/client_id/participant
  // match) plus, with p_include_other_coaches, other coaches' appointments
  // in the tenant — those come back with client-identifying fields
  // blanked out (is_own=false) so the calendar can render them dimmed for
  // scheduling context only.
  const calendarAppointments = (calendarResult.data ?? []) as any[]

  // Fetch client profiles for display in the table
  const clientIds = [...new Set((appointments ?? []).map((a: any) => a.client_id).filter(Boolean))]
  const clientMap = new Map<string, { full_name: string; avatar_url: string | null }>()
  if (clientIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', clientIds)
    ;(profiles ?? []).forEach((p: any) => clientMap.set(p.id, p))
  }

  // Client-side text filter after loading
  const filtered = q
    ? (appointments ?? []).filter((a: any) => {
        const client = clientMap.get(a.client_id)
        return (
          a.title?.toLowerCase().includes(q.toLowerCase()) ||
          client?.full_name?.toLowerCase().includes(q.toLowerCase())
        )
      })
    : (appointments ?? [])
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[var(--color-foreground)]">
            Mis Citas
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {view === 'calendar' ? `Semana del ${localDateStr(weekStart)}` : `${count ?? 0} cita${count !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center gap-0 rounded-lg border border-[var(--color-border)] overflow-hidden">
            <Link href="/coach/appointments"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view !== 'calendar' ? 'bg-[var(--color-coach)] text-white' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              <LayoutList size={13} />Lista
            </Link>
            <Link href="/coach/appointments?view=calendar"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'calendar' ? 'bg-[var(--color-coach)] text-white' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              <CalendarDays size={13} />Calendario
            </Link>
          </div>
          <CoachNewAppointmentButton
            clients={clientList}
            coachId={user!.id}
            coachName={coachName}
          />
        </div>
      </div>

      {view === 'calendar' ? (
        <CoachAppointmentsCalendar
          appointments={calendarAppointments}
          weekStart={localDateStr(weekStart)}
          clients={clientList}
          coachId={user!.id}
          coachName={coachName}
        />
      ) : (
        <>
          {/* Search */}
          <div className="mt-4 mb-4">
            <SearchInput placeholder="Buscar por título o cliente..." className="max-w-xs" />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={tab.value === 'all' ? '/coach/appointments' : `/coach/appointments?status=${tab.value}`}
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

          {/* Table */}
          <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Cita</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
                {paginated.length > 0 ? (
                  paginated.map((apt: any) => {
                    const client = clientMap.get(apt.client_id)
                    const { date, time } = formatDateTime(apt.start_time)
                    return (
                      <tr key={apt.id} className="hover:bg-[var(--color-muted)] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--color-foreground)]">{apt.title}</p>
                          {apt.notes && (
                            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-1">{apt.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {client ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={client.full_name} src={client.avatar_url} size="sm" className="bg-[var(--color-client-light)]" />
                              <span className="text-sm text-[var(--color-foreground)]">{client.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-[var(--color-foreground)] capitalize">{date}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">{time}</p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                            {TYPE_ICON[apt.appointment_type]}
                            {TYPE_LABEL[apt.appointment_type] ?? apt.appointment_type}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge value={apt.status} />
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <CalendarDays size={32} className="text-[var(--color-border)]" />
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {q ? `Sin resultados para "${q}"` : statusFilter !== 'all' ? 'Sin citas con ese estado' : 'Aún no tienes citas programadas'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination total={filtered.length} pageSize={PAGE_SIZE} currentPage={page} />
        </>
      )}
    </div>
  )
}
