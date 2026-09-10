import { createClient } from '@/lib/supabase/server'
import { SearchInput } from '@/components/shared/search-input'
import { Pagination } from '@/components/shared/pagination'
import { CoachNewAppointmentButton } from '@/components/coach/coach-new-appointment-button'
import { CoachAppointmentsCalendar } from '@/components/coach/coach-appointments-calendar'
import { CoachAppointmentsGuestTable } from '@/components/coach/coach-appointments-guest-table'
import { CoachAppointmentListFilters } from '@/components/coach/coach-appointment-list-filters'
import { CalendarDays, LayoutList } from 'lucide-react'
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
  searchParams: Promise<{ status?: string; q?: string; page?: string; view?: string; week?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const statusFilter = params.status ?? 'all'
  const q     = params.q ?? ''
  const page  = Math.max(1, parseInt(params.page ?? '1'))
  const view  = params.view ?? 'list'
  const PAGE_SIZE = 20

  // Defaults the list to "today" — same reasoning as the admin appointments
  // list: a coach's whole appointment history isn't a useful landing view.
  const todayStr       = localDateStr(new Date())
  const isDefaultRange = !params.from && !params.to
  const fromFilter      = params.from ?? todayStr
  const toFilter        = params.to   ?? (params.from ?? todayStr)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const weekStart = getWeekStart(params.week)
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const [listResult, profileResult, clientsResult, calendarResult] = await Promise.all([
    // list_appointments (no p_include_other_coaches) already scopes to
    // coach_id = auth.uid() — this replaces the old raw
    // .from('appointments') query, which never fetched group_mode or
    // participants at all, so group classes had no guest breakdown here.
    supabase.rpc('list_appointments'),
    supabase.from('profiles').select('full_name, tenant_id').eq('id', user!.id).single(),
    // Scoped to this coach's assigned clients only — get_profiles_by_role
    // would return every client in the tenant, letting a coach schedule
    // appointments with clients that aren't theirs.
    supabase
      .from('coach_client_assignments')
      .select('profiles!coach_client_assignments_client_id_fkey(id, full_name)')
      .eq('coach_id', user!.id),
    view === 'calendar'
      ? supabase.rpc('list_appointments', {
          p_start_time: weekStart.toISOString(),
          p_end_time: weekEnd.toISOString(),
          p_include_other_coaches: true,
        })
      : Promise.resolve({ data: null, error: null }),
  ])

  const coachName = profileResult.data?.full_name ?? ''
  const clientList = ((clientsResult.data ?? []) as any[])
    .map((row) => (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles))
    .filter(Boolean) as { id: string; full_name: string }[]

  // Grace hours gate the "Reenviar" resend button in the guests modal.
  const tenantId = (profileResult.data as { tenant_id?: string } | null)?.tenant_id
  const tenantResult = tenantId
    ? await supabase.from('tenants').select('appointment_grace_hours').eq('id', tenantId).single()
    : { data: null }
  const tenantGraceHours = (tenantResult.data as { appointment_grace_hours: number } | null)?.appointment_grace_hours ?? 2
  // list_appointments scopes to the caller (coach_id/client_id/participant
  // match) plus, with p_include_other_coaches, other coaches' appointments
  // in the tenant — those come back with client-identifying fields
  // blanked out (is_own=false) so the calendar can render them dimmed for
  // scheduling context only.
  const calendarAppointments = (calendarResult.data ?? []) as any[]

  const rawApts = (listResult.data ?? []) as Array<{
    id: string; title: string; description: string | null
    start_time: string; end_time: string; status: string
    appointment_type: string; location: string | null; meeting_url: string | null
    group_mode: string; coach_id: string | null; coach_name: string | null
    client_id: string | null; client_name: string | null; client_avatar: string | null
    series_id: string | null; class_template_id: string | null; max_participants: number | null
    participants: Array<{ id: string; full_name: string; avatar_url: string | null; status?: string; participant_id?: string }>
    cancellation_reason: string | null
  }>
  const normalizedApts = rawApts.map(a => ({
    ...a,
    client: a.client_id ? { full_name: a.client_name ?? '', avatar_url: a.client_avatar ?? null } : null,
    coach:  a.coach_id  ? { full_name: a.coach_name  ?? '' }                                       : null,
  }))

  // Status + date-range + text filter (title or 1:1 client name)
  let filtered = statusFilter === 'all' ? normalizedApts : normalizedApts.filter(a => a.status === statusFilter)
  filtered = filtered.filter(a => {
    const d = localDateStr(new Date(a.start_time))
    return d >= fromFilter && d <= toFilter
  })
  if (q) {
    const needle = q.toLowerCase()
    filtered = filtered.filter(a =>
      a.title?.toLowerCase().includes(needle) || a.client?.full_name?.toLowerCase().includes(needle)
    )
  }

  const count = filtered.length
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[var(--color-foreground)]">
            Mis Citas
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {view === 'calendar' ? `Semana del ${localDateStr(weekStart)}` : `${count} cita${count !== 1 ? 's' : ''}${isDefaultRange ? ' hoy' : ''}`}
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

          {/* Date range filter */}
          <div className="mt-3">
            <CoachAppointmentListFilters defaultFrom={fromFilter} defaultTo={toFilter} isDefaultToday={isDefaultRange} />
          </div>

          <CoachAppointmentsGuestTable
            appointments={paginated as any}
            tenantGraceHours={tenantGraceHours}
            statusFilter={statusFilter}
            emptyMessage={q ? `Sin resultados para "${q}"` : undefined}
          />

          <Pagination total={count} pageSize={PAGE_SIZE} currentPage={page} />
        </>
      )}
    </div>
  )
}
