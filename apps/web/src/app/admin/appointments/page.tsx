import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { NewAppointmentButton } from '@/components/admin/new-appointment-button'
import { AppointmentsCalendar } from '@/components/admin/appointments-calendar'
import { AdminAppointmentsTable } from '@/components/admin/admin-appointments-table'
import { CalendarDays, LayoutList } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Citas' }

const STATUS_TABS = [
  { value: 'all',       label: 'Todas'       },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas'  },
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
          appointments={appointments as any}
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

          <AdminAppointmentsTable
            appointments={appointments as any}
            coaches={coachList}
            clients={clientList}
            statusFilter={statusFilter}
          />

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
    </div>
  )
}
