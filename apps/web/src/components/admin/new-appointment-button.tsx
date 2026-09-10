'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import AppointmentFormModal, {
  type AppointmentModalClient,
  type AppointmentModalCoach,
} from '@/components/admin/appointment-form-modal'
import { AppointmentTypeChoiceModal } from '@/components/admin/appointment-type-choice-modal'

interface Props {
  coaches:        AppointmentModalCoach[]
  clients:        AppointmentModalClient[]
  currentUserId?: string
}

export function NewAppointmentButton({ coaches, clients, currentUserId }: Props) {
  const [showChoice, setShowChoice] = useState(false)
  const [mode, setMode] = useState<'class' | 'appointment' | null>(null)

  return (
    <>
      <button type="button" onClick={() => setShowChoice(true)}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}>
        <Plus size={16} />
        Nueva
      </button>

      {showChoice && (
        <AppointmentTypeChoiceModal
          onChoose={(m) => { setMode(m); setShowChoice(false) }}
          onClose={() => setShowChoice(false)}
        />
      )}

      {mode && (
        <AppointmentFormModal
          mode={mode}
          coaches={coaches}
          clients={clients}
          currentUserId={currentUserId}
          onClose={() => setMode(null)}
        />
      )}
    </>
  )
}
