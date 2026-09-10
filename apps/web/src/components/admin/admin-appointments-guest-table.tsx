'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import AppointmentEditModal, { type AppointmentForEdit } from '@/components/admin/appointment-edit-modal'
import { ClassRosterModal } from '@/components/admin/class-roster-modal'
import { resendAppointmentReminderAction } from '@/lib/admin/appointment-actions'
import { STATUS_LABELS, RESENDABLE_STATUSES, canResendGuestRow, type GuestRow, type GuestRowSourceAppointment } from '@/lib/admin/appointment-guest-rows'

interface Coach  { id: string; full_name: string }
interface Client { id: string; full_name: string }

interface Props {
  rows: GuestRow[]
  coaches: Coach[]
  clients: Client[]
  tenantGraceHours: number
  statusFilter: string
}

function formatDateTime(iso: string) {
  const d    = new Date(iso)
  const date = new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit' }).format(d)
  return { date, time }
}

export function AdminAppointmentsGuestTable({ rows, coaches, clients, tenantGraceHours, statusFilter }: Props) {
  const [editingApt, setEditingApt] = useState<GuestRowSourceAppointment | null>(null)
  const [pending, startTransition] = useTransition()
  const [sendingKey, setSendingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})

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

  if (rows.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center">
          <CalendarDays size={24} className="text-[var(--color-border)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">No hay citas</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {statusFilter !== 'all' ? 'No hay citas con este estado.' : 'Crea la primera cita con el botón de arriba, o ajusta los filtros.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Cita</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Coach</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Invitado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {rows.map((row) => {
              const { date, time } = formatDateTime(row.startTime)
              const statusInfo = STATUS_LABELS[row.status] ?? { label: row.status, className: 'bg-zinc-100 text-zinc-500 border-zinc-200' }
              const resendable = canResendGuestRow(row, tenantGraceHours)
              const msg = feedback[row.key]

              return (
                <tr
                  key={row.key}
                  onClick={() => setEditingApt(row.source)}
                  className="hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
                  style={row.status === 'postpone_requested'
                    ? { backgroundColor: 'color-mix(in srgb, #f59e0b 6%, transparent)' }
                    : undefined}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-foreground)] line-clamp-1">{row.appointmentTitle}{row.isGroup ? ' · Grupal' : ''}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 tabular-nums">{date} · {time}</p>
                    {row.status === 'cancelled' && row.source.cancellation_reason && (
                      <p className="text-xs text-red-500 mt-0.5 line-clamp-1">{row.source.cancellation_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-[var(--color-muted-foreground)]">
                    {row.coachName}
                  </td>
                  <td className="px-4 py-3">
                    {row.guestId ? (
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.guestName} src={row.guestAvatar} size="sm" />
                        <span className="text-sm text-[var(--color-foreground)]">{row.guestName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--color-muted-foreground)] italic">{row.guestName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
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

      {editingApt && editingApt.class_template_id ? (
        <ClassRosterModal
          appointment={editingApt as any}
          onClose={() => setEditingApt(null)}
        />
      ) : editingApt && (
        <AppointmentEditModal
          appointment={editingApt as unknown as AppointmentForEdit}
          coaches={coaches}
          clients={clients}
          onClose={() => setEditingApt(null)}
        />
      )}
    </>
  )
}
