'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PlanFormModal } from './plan-form-modal'

interface Branch {
  id: string
  name: string
}

export function NewPlanButton({ branches = [] }: { branches?: Branch[] }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
      >
        <Plus size={14} />
        Nuevo plan
      </button>

      {showModal && (
        <PlanFormModal branches={branches} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
