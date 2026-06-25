'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import AppointmentFormModal, {
  type AppointmentModalClient,
  type AppointmentModalCoach,
} from '@/components/admin/appointment-form-modal'

interface Props {
  coaches:        AppointmentModalCoach[]
  clients:        AppointmentModalClient[]
  currentUserId?: string
}

export function NewAppointmentButton({ coaches, clients, currentUserId }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}>
        <Plus size={16} />
        Nueva cita
      </button>

      {open && (
        <AppointmentFormModal
          coaches={coaches}
          clients={clients}
          currentUserId={currentUserId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
