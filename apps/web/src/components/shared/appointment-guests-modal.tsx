'use client'

import { useState, useTransition } from 'react'
import { X, Bell, Users, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { resendAppointmentReminderAction } from '@/lib/admin/appointment-actions'
import {
  flattenToGuestRows,
  STATUS_LABELS,
  RESENDABLE_STATUSES,
  canResendGuestRow,
  type GuestRowSourceAppointment,
} from '@/lib/admin/appointment-guest-rows'

interface Props {
  appointment: GuestRowSourceAppointment
  tenantGraceHours: number
  onClose: () => void
  /** CSS var name (without the `--color-` prefix) for the accent — 'admin' or 'coach'. */
  accent?: 'admin' | 'coach'
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  const time = new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit' }).format(d)
  return { date, time }
}

export function AppointmentGuestsModal({ appointment, tenantGraceHours, onClose, accent = 'admin' }: Props) {
  const [pending, startTransition] = useTransition()
  const [sendingKey, setSendingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  const rows = flattenToGuestRows([appointment])
  const { date, time } = formatDateTime(appointment.start_time)
  const accentVar = `var(--color-${accent})`

  const confirmedCount = rows.filter(r => r.status === 'confirmed' || r.status === 'attended').length
  const pendingCount   = rows.filter(r => RESENDABLE_STATUSES.has(r.status)).length
  const cancelledCount = rows.filter(r => r.status === 'cancelled').length

  function handleResend(row: (typeof rows)[number]) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Users size={15} style={{ color: accentVar }} />
              <h2 className="text-sm font-semibold text-[var(--color-foreground)] truncate">{appointment.title}</h2>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1 capitalize">{date} · {time}</p>
            {appointment.group_mode === 'group' && appointment.max_participants != null && (
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                {rows.filter(r => r.status !== 'cancelled').length}/{appointment.max_participants} cupos ocupados
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-muted)] text-xs">
          <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 size={12} />{confirmedCount} confirmado{confirmedCount !== 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1 text-amber-700"><Clock size={12} />{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1 text-zinc-500"><XCircle size={12} />{cancelledCount} cancelado{cancelledCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Guest list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-10">Sin invitados registrados.</p>
          ) : rows.map((row) => {
            const statusInfo = STATUS_LABELS[row.status] ?? { label: row.status, className: 'bg-zinc-100 text-zinc-500 border-zinc-200' }
            const resendable = canResendGuestRow(row, tenantGraceHours)
            const msg = feedback[row.key]
            return (
              <div key={row.key} className="flex items-center gap-3 px-5 py-3">
                {row.guestId ? (
                  <Avatar name={row.guestName} src={row.guestAvatar} size="sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--color-muted)] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-foreground)] truncate">{row.guestName}</p>
                  <span className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>
                {RESENDABLE_STATUSES.has(row.status) && row.guestId && (
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
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
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
