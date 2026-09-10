'use client'

import { useMemo, useState, useTransition } from 'react'
import { X, Bell, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { resendAppointmentReminderAction } from '@/lib/admin/appointment-actions'

interface Participant { id: string; full_name: string; avatar_url: string | null; status?: string; participant_id?: string }

interface Appointment {
  id: string
  title: string
  start_time: string
  end_time: string
  status: string
  group_mode: string
  coach: { full_name: string } | null
  client_id: string | null
  client: { full_name: string; avatar_url: string | null } | null
  participants: Participant[]
  cancellation_reason: string | null
}

interface GuestRow {
  key: string
  appointmentId: string
  appointmentTitle: string
  startTime: string
  endTime: string
  coachName: string
  guestId: string | null
  guestName: string
  guestAvatar: string | null
  status: string
  isGroup: boolean
}

interface Props {
  day: string | null
  appointments: Appointment[]
  tenantGraceHours: number
  onClose: () => void
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_confirmation: { label: 'Pendiente',    className: 'bg-amber-50 text-amber-700 border-amber-200' },
  scheduled:            { label: 'Pendiente',    className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:            { label: 'Confirmado',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:            { label: 'Completada',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
  attended:             { label: 'Asistió',      className: 'bg-blue-50 text-blue-700 border-blue-200' },
  no_show:              { label: 'No asistió',   className: 'bg-red-50 text-red-700 border-red-200' },
  cancelled:            { label: 'Cancelado',    className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  postpone_requested:   { label: 'Aplazamiento solicitado', className: 'bg-orange-50 text-orange-700 border-orange-200' },
}

const RESENDABLE_STATUSES = new Set(['pending_confirmation', 'scheduled'])
const PAGE_SIZE = 8

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function formatDayLabel(dayStr: string) {
  const d = new Date(`${dayStr}T00:00:00`)
  return new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

export function DayAppointmentsPanel({ day, appointments, tenantGraceHours, onClose }: Props) {
  const [page, setPage] = useState(1)
  const [pending, startTransition] = useTransition()
  const [sendingKey, setSendingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  const rows: GuestRow[] = useMemo(() => {
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
            coachName: apt.coach?.full_name ?? 'Sin asignar',
            guestId: p.id,
            guestName: p.full_name,
            guestAvatar: p.avatar_url,
            status: p.status ?? 'pending_confirmation',
            isGroup: true,
          })
        }
        if (apt.participants.length === 0) {
          out.push({
            key: apt.id,
            appointmentId: apt.id,
            appointmentTitle: apt.title,
            startTime: apt.start_time,
            endTime: apt.end_time,
            coachName: apt.coach?.full_name ?? 'Sin asignar',
            guestId: null,
            guestName: 'Sin inscritos',
            guestAvatar: null,
            status: apt.status,
            isGroup: true,
          })
        }
      } else {
        out.push({
          key: apt.id,
          appointmentId: apt.id,
          appointmentTitle: apt.title,
          startTime: apt.start_time,
          endTime: apt.end_time,
          coachName: apt.coach?.full_name ?? 'Sin asignar',
          guestId: apt.client_id,
          guestName: apt.client?.full_name ?? 'Sin cliente',
          guestAvatar: apt.client?.avatar_url ?? null,
          status: apt.status,
          isGroup: false,
        })
      }
    }
    return out.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [appointments])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const confirmedCount = rows.filter(r => r.status === 'confirmed' || r.status === 'attended').length
  const cancelledCount = rows.filter(r => r.status === 'cancelled').length

  function canResend(row: GuestRow): boolean {
    if (!row.guestId) return false
    if (!RESENDABLE_STATUSES.has(row.status)) return false
    const cutoff = new Date(row.startTime).getTime() - tenantGraceHours * 3_600_000
    return Date.now() < cutoff
  }

  function handleResend(row: GuestRow) {
    if (!row.guestId) return
    setSendingKey(row.key)
    startTransition(async () => {
      const result = await resendAppointmentReminderAction({
        appointmentId: row.appointmentId,
        userId: row.guestId!,
        guestName: row.guestName,
        appointmentTitle: row.appointmentTitle,
        startTime: row.startTime,
      })
      setFeedback(f => ({ ...f, [row.key]: result.error ?? 'Notificación enviada' }))
      setSendingKey(null)
    })
  }

  if (!day) return null

  return (
    <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="flex items-center gap-2.5">
          <Users size={15} className="text-[var(--color-admin)]" />
          <p className="text-sm font-semibold text-[var(--color-foreground)] capitalize">{formatDayLabel(day)}</p>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {rows.length} invitado{rows.length !== 1 ? 's' : ''} · {confirmedCount} confirmado{confirmedCount !== 1 ? 's' : ''} · {cancelledCount} cancelado{cancelledCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] transition-colors">
          <X size={16} />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)] text-center py-10">Sin citas este día.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Hora</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Cita</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Coach</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Invitado</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {pageRows.map((row) => {
                const statusInfo = STATUS_LABELS[row.status] ?? { label: row.status, className: 'bg-zinc-100 text-zinc-500 border-zinc-200' }
                const resendable = canResend(row)
                const msg = feedback[row.key]
                return (
                  <tr key={row.key} className="hover:bg-[var(--color-muted)] transition-colors">
                    <td className="px-4 py-2.5 tabular-nums text-[var(--color-foreground)] whitespace-nowrap">{formatTime(row.startTime)}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-[var(--color-foreground)] line-clamp-1">{row.appointmentTitle}</p>
                      {row.isGroup && <p className="text-xs text-[var(--color-muted-foreground)]">Grupal</p>}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-[var(--color-muted-foreground)]">{row.coachName}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={row.guestName} src={row.guestAvatar} size="sm" />
                        <span className="text-[var(--color-foreground)]">{row.guestName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {RESENDABLE_STATUSES.has(row.status) && row.guestId ? (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => handleResend(row)}
                            disabled={!resendable || pending}
                            title={!resendable ? 'Dentro del periodo límite de confirmación — ya no se puede reenviar' : 'Reenviar notificación de recordatorio'}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Bell size={12} />
                            {sendingKey === row.key && pending ? 'Enviando…' : 'Reenviar'}
                          </button>
                          {msg && <span className="text-[11px] text-[var(--color-muted-foreground)]">{msg}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-muted-foreground)]">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
