// Shared between the calendar's day-detail panel and the list view's guest
// table so both flatten appointments -> one row per guest (one row per
// group-class participant, or one row per 1:1 client) the exact same way,
// and agree on which statuses are "still needs to confirm" and when the
// resend-reminder action is allowed.

export interface GuestRowParticipant {
  id: string
  full_name: string
  avatar_url: string | null
  status?: string
  participant_id?: string
}

export interface GuestRowSourceAppointment {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  status: string
  appointment_type: string
  location: string | null
  meeting_url: string | null
  group_mode: string
  coach_id: string | null
  coach_name: string | null
  coach: { full_name: string } | null
  client_id: string | null
  client_name: string | null
  client: { full_name: string; avatar_url: string | null } | null
  series_id: string | null
  class_template_id?: string | null
  max_participants?: number | null
  participants: GuestRowParticipant[]
  cancellation_reason: string | null
}

export interface GuestRow {
  key: string
  appointmentId: string
  appointmentTitle: string
  startTime: string
  endTime: string
  coachId: string | null
  coachName: string
  guestId: string | null
  guestName: string
  guestAvatar: string | null
  status: string
  isGroup: boolean
  source: GuestRowSourceAppointment
}

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_confirmation: { label: 'Pendiente',    className: 'bg-amber-50 text-amber-700 border-amber-200' },
  scheduled:            { label: 'Pendiente',    className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:            { label: 'Confirmado',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:            { label: 'Completada',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
  attended:             { label: 'Asistió',      className: 'bg-blue-50 text-blue-700 border-blue-200' },
  no_show:              { label: 'No asistió',   className: 'bg-red-50 text-red-700 border-red-200' },
  cancelled:            { label: 'Cancelado',    className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  postpone_requested:   { label: 'Aplazamiento solicitado', className: 'bg-orange-50 text-orange-700 border-orange-200' },
}

export const RESENDABLE_STATUSES = new Set(['pending_confirmation', 'scheduled'])

export function flattenToGuestRows(appointments: GuestRowSourceAppointment[]): GuestRow[] {
  const out: GuestRow[] = []
  for (const apt of appointments) {
    const isGroup = apt.group_mode === 'group'
    if (isGroup) {
      for (const p of apt.participants) {
        out.push({
          key: `${apt.id}:${p.id}`,
          appointmentId: apt.id,
          appointmentTitle: apt.title,
          startTime: apt.start_time,
          endTime: apt.end_time,
          coachId: apt.coach_id,
          coachName: apt.coach?.full_name ?? 'Sin asignar',
          guestId: p.id,
          guestName: p.full_name,
          guestAvatar: p.avatar_url,
          status: p.status ?? 'pending_confirmation',
          isGroup: true,
          source: apt,
        })
      }
      if (apt.participants.length === 0) {
        out.push({
          key: apt.id,
          appointmentId: apt.id,
          appointmentTitle: apt.title,
          startTime: apt.start_time,
          endTime: apt.end_time,
          coachId: apt.coach_id,
          coachName: apt.coach?.full_name ?? 'Sin asignar',
          guestId: null,
          guestName: 'Sin inscritos',
          guestAvatar: null,
          status: apt.status,
          isGroup: true,
          source: apt,
        })
      }
    } else {
      out.push({
        key: apt.id,
        appointmentId: apt.id,
        appointmentTitle: apt.title,
        startTime: apt.start_time,
        endTime: apt.end_time,
        coachId: apt.coach_id,
        coachName: apt.coach?.full_name ?? 'Sin asignar',
        guestId: apt.client_id,
        guestName: apt.client?.full_name ?? 'Sin cliente',
        guestAvatar: apt.client?.avatar_url ?? null,
        status: apt.status,
        isGroup: false,
        source: apt,
      })
    }
  }
  return out.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
}

export function canResendGuestRow(row: GuestRow, tenantGraceHours: number): boolean {
  if (!row.guestId) return false
  if (!RESENDABLE_STATUSES.has(row.status)) return false
  const cutoff = new Date(row.startTime).getTime() - tenantGraceHours * 3_600_000
  return Date.now() < cutoff
}
