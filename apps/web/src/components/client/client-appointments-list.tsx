'use client'

import { useState } from 'react'
import { Clock, User } from 'lucide-react'
import { CalendarDays } from 'lucide-react'
import { AppointmentDetailSheet, type AppointmentDetail } from './appointment-detail-sheet'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Programada', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  confirmed:  { label: 'Confirmada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:  { label: 'Completada', cls: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]' },
  cancelled:  { label: 'Cancelada',  cls: 'bg-red-50 text-red-700 border-red-200' },
  no_show:    { label: 'No asistió', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

interface Props {
  upcoming: AppointmentDetail[]
  past: AppointmentDetail[]
}

function AppointmentCard({ appt, onClick }: { appt: AppointmentDetail; onClick: () => void }) {
  const status = STATUS_CONFIG[appt.status] ?? { label: appt.status, cls: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]' }
  const start  = new Date(appt.start_time)
  const end    = appt.end_time ? new Date(appt.end_time) : null
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-start gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] transition-all hover:shadow-md hover:border-[var(--color-client)] focus-visible:outline-none focus-visible:ring-2"
      style={{ '--tw-ring-color': 'var(--color-client)' } as React.CSSProperties}
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--color-client-light)] flex flex-col items-center justify-center flex-shrink-0 text-[var(--color-client)]">
        <span className="text-[10px] font-bold uppercase">
          {start.toLocaleString('es-CR', { month: 'short' })}
        </span>
        <span className="text-base font-bold leading-none">{start.getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="font-medium text-[var(--color-foreground)]">{appt.title || 'Cita'}</p>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${status.cls}`}>
            {status.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <span className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
            <Clock size={11} />
            {start.toLocaleString('es-CR', { hour: '2-digit', minute: '2-digit' })}
            {end && ` – ${end.toLocaleString('es-CR', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
          {appt.coach?.full_name && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
              <User size={11} />
              {appt.coach.full_name}
            </span>
          )}
        </div>
        {appt.notes && <p className="text-xs text-[var(--color-muted-foreground)] mt-1 italic">{appt.notes}</p>}
      </div>
      {/* Hint arrow */}
      <span className="self-center text-[var(--color-muted-foreground)] opacity-50 text-lg">›</span>
    </button>
  )
}

export function ClientAppointmentsList({ upcoming, past }: Props) {
  const [selected, setSelected] = useState<AppointmentDetail | null>(null)

  const isEmpty = upcoming.length === 0 && past.length === 0

  return (
    <>
      {isEmpty ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
            <CalendarDays size={20} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sin citas</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Tu coach agendará citas contigo pronto.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">
                Próximas
              </h2>
              <div className="space-y-3">
                {upcoming.map((a) => (
                  <AppointmentCard key={a.id} appt={a} onClick={() => setSelected(a)} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">
                Historial
              </h2>
              <div className="space-y-3 opacity-75">
                {past.map((a) => (
                  <AppointmentCard key={a.id} appt={a} onClick={() => setSelected(a)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AppointmentDetailSheet appointment={selected} onClose={() => setSelected(null)} />
    </>
  )
}
