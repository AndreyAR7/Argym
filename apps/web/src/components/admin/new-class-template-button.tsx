'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ClassTemplateFormModal } from './class-template-form-modal'

interface Branch { id: string; name: string }
interface Coach { id: string; full_name: string }

interface NewClassTemplateButtonProps {
  branches: Branch[]
  coaches: Coach[]
  defaultCapacity: number
}

export function NewClassTemplateButton({ branches, coaches, defaultCapacity }: NewClassTemplateButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={branches.length === 0}
        className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
        title={branches.length === 0 ? 'Crea una sucursal primero' : undefined}
      >
        <Plus size={14} />
        Nueva clase
      </button>

      {showModal && (
        <ClassTemplateFormModal
          branches={branches}
          coaches={coaches}
          defaultCapacity={defaultCapacity}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
