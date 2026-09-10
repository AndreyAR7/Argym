'use client'

import { Users, CalendarClock, X } from 'lucide-react'

interface Props {
  onChoose: (mode: 'class' | 'appointment') => void
  onClose: () => void
}

// Shared by the "Nueva" button and the calendar's click-an-empty-slot flow
// so both ask the same question before opening AppointmentFormModal —
// previously only the button asked, so a calendar click silently defaulted
// to "appointment" with no way to create a class from the grid.
export function AppointmentTypeChoiceModal({ onChoose, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl shadow-xl p-6"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>¿Qué quieres crear?</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:opacity-70 transition-opacity" style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
          Ambas quedan en el calendario — elige según cómo quieres verla organizada.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChoose('class')}
            className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-[var(--color-muted)]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-admin-light)' }}>
              <Users size={18} style={{ color: 'var(--color-admin)' }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Clase</span>
            <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>Programada en grupo, con invitados</span>
          </button>
          <button
            type="button"
            onClick={() => onChoose('appointment')}
            className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-[var(--color-muted)]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-admin-light)' }}>
              <CalendarClock size={18} style={{ color: 'var(--color-admin)' }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Cita</span>
            <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>Individual o personalizada</span>
          </button>
        </div>
      </div>
    </div>
  )
}
