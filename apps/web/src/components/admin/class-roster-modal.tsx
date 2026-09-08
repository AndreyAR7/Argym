'use client'

import { useState, useTransition } from 'react'
import { X, Check, UserCheck, UserX } from 'lucide-react'
import { confirmClassSpotAction, markClassAttendanceAction } from '@/lib/admin/class-roster-actions'

interface Participant {
  participant_id: string
  id: string
  full_name: string
  avatar_url: string | null
  status: string
}

interface ClassInstance {
  id: string
  title: string
  start_time: string
  end_time: string
  max_participants?: number | null
  participants: Participant[]
}

interface ClassRosterModalProps {
  appointment: ClassInstance
  onClose: () => void
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending_confirmation: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:            { label: 'Confirmado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:            { label: 'Cancelado', className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  attended:             { label: 'Asistió', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  no_show:              { label: 'No asistió', className: 'bg-red-50 text-red-700 border-red-200' },
}

export function ClassRosterModal({ appointment, onClose }: ClassRosterModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const active = appointment.participants.filter(p => p.status !== 'cancelled')
  const taken = active.filter(p => p.status === 'pending_confirmation' || p.status === 'confirmed').length

  function handleConfirm(participantId: string) {
    setError(null)
    startTransition(async () => {
      const result = await confirmClassSpotAction(participantId)
      if (result?.error) setError(result.error)
    })
  }

  function handleAttendance(participantId: string, status: 'attended' | 'no_show') {
    setError(null)
    startTransition(async () => {
      const result = await markClassAttendanceAction(participantId, status)
      if (result?.error) setError(result.error)
    })
  }

  const startD = new Date(appointment.start_time)
  const timeStr = `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`
  const dateStr = startD.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">{appointment.title}</h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 capitalize">
              {dateStr} · {timeStr}
              {appointment.max_participants != null && ` · ${taken}/${appointment.max_participants} cupos`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <p className="mb-3 text-xs text-[var(--color-destructive)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {active.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-8">
              Nadie ha reservado cupo todavía.
            </p>
          ) : (
            <ul className="space-y-2">
              {active.map((p) => {
                const statusInfo = STATUS_LABELS[p.status] ?? { label: p.status, className: 'bg-zinc-100 text-zinc-500 border-zinc-200' }
                return (
                  <li key={p.participant_id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{p.full_name}</p>
                      <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {p.status === 'pending_confirmation' && (
                        <button
                          onClick={() => handleConfirm(p.participant_id)}
                          disabled={isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[var(--color-admin-light)] text-[var(--color-admin)] hover:opacity-80 transition-opacity disabled:opacity-50"
                          title="Aprobar solicitud"
                        >
                          <Check size={12} />
                          Aprobar
                        </button>
                      )}
                      {p.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleAttendance(p.participant_id, 'attended')}
                            disabled={isPending}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                            title="Marcar asistió"
                          >
                            <UserCheck size={14} />
                          </button>
                          <button
                            onClick={() => handleAttendance(p.participant_id, 'no_show')}
                            disabled={isPending}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Marcar no asistió"
                          >
                            <UserX size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
