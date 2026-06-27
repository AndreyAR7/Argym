'use client'

import { useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { updateAppointmentStatusAction } from '@/lib/admin/appointment-actions'

type Status = 'pending_confirmation' | 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled' | 'postpone_requested'

const TRANSITIONS: Record<Status, Status[]> = {
  pending_confirmation: ['confirmed', 'cancelled'],
  postpone_requested:   ['pending_confirmation', 'confirmed', 'cancelled'],
  scheduled:            ['confirmed', 'cancelled'],
  confirmed:            ['completed', 'no_show', 'cancelled'],
  completed:            [],
  no_show:              [],
  cancelled:            [],
}

const STATUS_LABELS: Record<Status, string> = {
  pending_confirmation: 'Pend. confirmación',
  postpone_requested:   'Cambio solicitado',
  scheduled:            'Programada',
  confirmed:            'Confirmada',
  completed:            'Completada',
  no_show:              'No asistió',
  cancelled:            'Cancelada',
}

interface AppointmentStatusSelectProps {
  appointmentId: string
  initialStatus: string
}

export function AppointmentStatusSelect({ appointmentId, initialStatus }: AppointmentStatusSelectProps) {
  const [status, setStatus] = useState<Status>(initialStatus as Status)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const transitions = TRANSITIONS[status] ?? []

  if (transitions.length === 0) {
    return <Badge value={status} />
  }

  function handleChange(next: Status) {
    setOpen(false)
    startTransition(async () => {
      const result = await updateAppointmentStatusAction(appointmentId, next)
      if (!result?.error) setStatus(next)
    })
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-1.5 disabled:opacity-50"
      >
        <Badge value={status} />
        <ChevronDown size={11} className="text-[var(--color-muted-foreground)]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-50 w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg py-1">
            {transitions.map((next) => (
              <button
                key={next}
                onClick={() => handleChange(next)}
                className="w-full px-3 py-2 text-left text-xs text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                → {STATUS_LABELS[next]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
