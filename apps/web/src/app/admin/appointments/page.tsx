import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { NewAppointmentButton } from '@/components/admin/new-appointment-button'
import { AppointmentsCalendar } from '@/components/admin/appointments-calendar'
import { AdminAppointmentsGuestTable } from '@/components/admin/admin-appointments-guest-table'
import { AppointmentListFilters } from '@/components/admin/appointment-list-filters'
import { flattenToGuestRows } from '@/lib/admin/appointment-guest-rows'
import { CalendarDays, LayoutList, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Citas' }

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

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; view?: string; week?: string; date?: string; coach?: string }>
}) {
  const params = await searchParams
  const statusFilter = params.status ?? 'all'
  const dateFilter  = params.date ?? ''
  const coachFilter = params.coach ?? 'all'
  const page        = Math.max(1, parseInt(params.page ?? '1'))
  const view        = params.view ?? 'list'
  const PAGE_SIZE   = 30

  const session = await getSessionData()
  const { supabase, user, tenantId } = session!

  const weekStart = getWeekStart(params.week)
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const [coachResult, clientResult, appointmentsResult, branchResult, blocksResult, tenantResult] = await Promise.all([
    supabase.rpc('get_profiles_by_role', { role_name: 'coach' }),
    supabase.rpc('get_profiles_by_role', { role_name: 'client' }),
    // SECURITY DEFINER RPC — bypasses RLS issues with user_roles subquery
    view === 'calendar'
      ? supabase.rpc('list_appointments', {
          p_start_time: weekStart.toISOString(),
          p_end_time:   weekEnd.toISOString(),
        })
      : supabase.rpc('list_appointments'),
    supabase.from('branches').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).order('name'),
    view === 'calendar'
      ? supabase
          .from('schedule_blocks')
          .select('id, branch_id, coach_id, start_time, end_time, reason')
          .eq('tenant_id', tenantId)
          .lt('start_time', weekEnd.toISOString())
          .gt('end_time', weekStart.toISOString())
      : Promise.resolve({ data: [], error: null }),
    // Grace hours also gate the "Reenviar" resend button in the list view now.
    supabase.from('tenants').select('appointment_grace_hours').eq('id', tenantId).single(),
  ])

  const loadError = appointmentsResult.error
  if (loadError) {
    console.error('[APPTS PAGE] list_appointments error:', loadError)
  }

  const coachList  = coachResult.data  ?? []
  const clientList = clientResult.data ?? []
  const branchList = branchResult.data ?? []
  const blockList  = blocksResult.data ?? []
  const tenantGraceHours = (tenantResult.data as { appointment_grace_hours: number } | null)?.appointment_grace_hours ?? 2

  // Normalize flat RPC response → shape expected by child components
  const rawApts = (appointmentsResult.data ?? []) as Array<{
    id: string; title: string; description: string | null
    start_time: string; end_time: string; status: string
    appointment_type: string; location: string | null; meeting_url: string | null
    group_mode: string; coach_id: string | null; coach_name: string | null
    client_id: string | null; client_name: string | null; client_avatar: string | null
    series_id: string | null
    participants: Array<{ id: string; full_name: string; avatar_url: string | null }>
    cancellation_reason: string | null
  }>

  const normalizedApts = rawApts.map(a => ({
    ...a,
    client: a.client_id ? { full_name: a.client_name ?? '', avatar_url: a.client_avatar ?? null } : null,
    coach:  a.coach_id  ? { full_name: a.coach_name  ?? '' }                                       : null,
  }))

  // Client-side status/date/coach filter (works with any volume a gym would have)
  let filtered = statusFilter === 'all' ? normalizedApts : normalizedApts.filter(a => a.status === statusFilter)
  if (dateFilter) filtered = filtered.filter(a => localDateStr(new Date(a.start_time)) === dateFilter)
  if (coachFilter !== 'all') filtered = filtered.filter(a => a.coach_id === coachFilter)

  const appointments = view === 'calendar'
    ? normalizedApts  // calendar already filtered by date in RPC
    : filtered

  // List view shows one row per guest (per group-class participant, or per
  // 1:1 client) rather than one row per appointment — pagination is over
  // that flattened, more granular unit.
  const guestRows  = flattenToGuestRows(appointments as any)
  const count      = view === 'calendar' ? appointments.length : guestRows.length
  const totalPages = Math.ceil(count / PAGE_SIZE)
  const pageGuestRows = guestRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function buildUrl(s?: string, p?: number) {
    const sp = new URLSearchParams()
    const st = s ?? statusFilter; const pg = p ?? page
    if (st !== 'all') sp.set('status', st)
    if (dateFilter) sp.set('date', dateFilter)
    if (coachFilter !== 'all') sp.set('coach', coachFilter)
    if (pg > 1) sp.set('page', String(pg))
    return `/admin/appointments${sp.toString() ? `?${sp.toString()}` : ''}`
  }

  return (
    <div className="p-4 md:p-8">
      {loadError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', color: 'var(--color-destructive)', border: '1px solid color-mix(in srgb, var(--color-destructive) 25%, transparent)' }}>
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          No se pudieron cargar las citas ({loadError.message}). Es posible que tu rol no tenga el permiso necesario — contacta al administrador de la plataforma.
        </div>
      )}
      <PageHeader
        title="Citas"
        subtitle={view === 'calendar'
          ? `Semana del ${localDateStr(weekStart)}`
          : `${count} registro${count !== 1 ? 's' : ''} (por invitado)`}
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
          branches={branchList}
          blocks={blockList}
          weekStart={localDateStr(weekStart)}
          tenantGraceHours={tenantGraceHours}
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

          {/* Date + coach filters */}
          <div className="mt-3">
            <AppointmentListFilters defaultDate={dateFilter} defaultCoach={coachFilter} coaches={coachList} />
          </div>

          <AdminAppointmentsGuestTable
            rows={pageGuestRows}
            coaches={coachList}
            clients={clientList}
            tenantGraceHours={tenantGraceHours}
            statusFilter={statusFilter}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-[var(--color-muted-foreground)]">{count} registros · página {page} de {totalPages}</p>
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
