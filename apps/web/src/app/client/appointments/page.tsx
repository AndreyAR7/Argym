import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ClientAppointmentsCalendar } from '@/components/client/appointments-calendar'
import { ClientAppointmentsList } from '@/components/client/client-appointments-list'
import { CalendarDays, LayoutList } from 'lucide-react'
import Link from 'next/link'
import { RequestAppointmentModal } from './request-appointment-modal'

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

  // list_appointments() — not a raw .eq('client_id', user.id) query, which
  // only ever found appointments where the client is the PRIMARY invitee.
  // A client invited to a group "clase" as an appointment_participants row
  // (any invitee past the first one picked when the class was created)
  // never showed up here at all under the old query, even though they
  // already got a push notification and appear in admin/coach guest
  // tables — this was the actual bug behind "fuiste invitado pero no veo
  // la clase". list_appointments already scopes correctly to client_id OR
  // participant match for a plain client caller.
  const { data: rpcRows } = view === 'calendar'
    ? await supabase.rpc('list_appointments', {
        p_start_time: weekStart.toISOString(),
        p_end_time:   weekEnd.toISOString(),
      })
    : await supabase.rpc('list_appointments')

  const all = ((rpcRows ?? []) as any[]).map((a) => ({
    id: a.id,
    title: a.title,
    start_time: a.start_time,
    end_time: a.end_time,
    status: a.status,
    appointment_type: a.appointment_type,
    notes: a.notes ?? null,
    location: a.location,
    meeting_url: a.meeting_url,
    cancellation_reason: a.cancellation_reason,
    coach: a.coach_name ? { full_name: a.coach_name } : null,
    // true when I'm only invited via appointment_participants, not the
    // appointment's own client_id — my own confirm/decline must act on
    // MY participant row, never the whole class's status.
    isParticipant: a.client_id !== user.id,
    myParticipantStatus: a.my_participant_status ?? null,
  })).sort((a, b) =>
    view === 'calendar'
      ? new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      : new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )
  const ACTIVE_STATUSES = ['scheduled', 'confirmed', 'pending_confirmation', 'postpone_requested']
  const upcoming = all.filter((a: any) => ACTIVE_STATUSES.includes(a.status))
  const past     = all.filter((a: any) => !ACTIVE_STATUSES.includes(a.status))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Mis Citas"
        subtitle={view === 'calendar'
          ? `Semana del ${localDateStr(weekStart)}`
          : `${all.length} cita${all.length !== 1 ? 's' : ''} en total`}
      >
        <RequestAppointmentModal />
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
        <ClientAppointmentsList upcoming={upcoming} past={past} userId={user.id} />
      )}
    </div>
  )
}
