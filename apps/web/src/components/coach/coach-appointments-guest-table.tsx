'use client'

import { useState } from 'react'
import { CalendarDays, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { AppointmentGuestsModal } from '@/components/shared/appointment-guests-modal'
import { aggregateAppointmentStatus, type GuestRowSourceAppointment } from '@/lib/admin/appointment-guest-rows'

interface Props {
  appointments: GuestRowSourceAppointment[]
  tenantGraceHours: number
  statusFilter: string
  emptyMessage?: string
}

function formatDateTime(iso: string) {
  const d    = new Date(iso)
  const date = new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit' }).format(d)
  return { date, time }
}

export function CoachAppointmentsGuestTable({ appointments, tenantGraceHours, statusFilter, emptyMessage }: Props) {
  const [guestsApt, setGuestsApt] = useState<GuestRowSourceAppointment | null>(null)

  if (appointments.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center">
          <CalendarDays size={24} className="text-[var(--color-border)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">No hay citas</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {emptyMessage ?? (statusFilter !== 'all' ? 'No hay citas con este estado en el rango seleccionado.' : 'Ajusta el rango de fechas para ver más citas.')}
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Invitados</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {appointments.map((apt) => {
              const { date, time } = formatDateTime(apt.start_time)
              const isGroup = apt.group_mode === 'group'
              const activeGuests = apt.participants.filter(p => p.status !== 'cancelled')
              const cancelledGuests = apt.participants.filter(p => p.status === 'cancelled')
              const statusInfo = aggregateAppointmentStatus(apt)
              const singleGuest = !isGroup && apt.client ? apt.client : null

              return (
                <tr
                  key={apt.id}
                  className="hover:bg-[var(--color-muted)] transition-colors"
                  style={apt.status === 'postpone_requested'
                    ? { backgroundColor: 'color-mix(in srgb, #f59e0b 6%, transparent)' }
                    : undefined}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-foreground)] line-clamp-1">{apt.title}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 tabular-nums">{date} · {time}</p>
                    {apt.status === 'cancelled' && apt.cancellation_reason && (
                      <p className="text-xs text-red-500 mt-0.5 line-clamp-1">{apt.cancellation_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setGuestsApt(apt)}
                      className="inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors"
                    >
                      {singleGuest ? (
                        <>
                          <Avatar name={singleGuest.full_name} src={singleGuest.avatar_url} size="sm" />
                          <span className="text-xs font-medium text-[var(--color-foreground)] max-w-[9rem] truncate">{singleGuest.full_name}</span>
                        </>
                      ) : (
                        <>
                          <div className="flex -space-x-2">
                            {activeGuests.slice(0, 3).map((p, i) => (
                              <Avatar key={i} name={p.full_name} src={p.avatar_url} size="sm" />
                            ))}
                            {activeGuests.length === 0 && (
                              <div className="w-6 h-6 rounded-full bg-[var(--color-muted)] flex items-center justify-center">
                                <Users size={11} className="text-[var(--color-muted-foreground)]" />
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium text-[var(--color-foreground)]">
                            {activeGuests.length} invitado{activeGuests.length !== 1 ? 's' : ''}
                            {cancelledGuests.length > 0 ? ` · ${cancelledGuests.length} canceló` : ''}
                          </span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {guestsApt && (
        <AppointmentGuestsModal
          appointment={guestsApt}
          tenantGraceHours={tenantGraceHours}
          onClose={() => setGuestsApt(null)}
          accent="coach"
        />
      )}
    </>
  )
}
