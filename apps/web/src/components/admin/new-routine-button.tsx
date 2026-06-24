'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { RoutineFormModal } from '@/components/admin/routine-form-modal'

export function NewRoutineButton() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-lg bg-[var(--color-admin)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
      >
        <Plus size={14} />
        Nueva rutina
      </button>

      {showModal && (
        <RoutineFormModal onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
