'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PromotionFormModal, type PromotionPlan } from './promotion-form-modal'

export function NewPromotionButton({ plans = [] }: { plans?: PromotionPlan[] }) {
  const [show, setShow] = useState(false)
  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
      >
        <Plus size={14} />
        Nueva promoción
      </button>
      {show && <PromotionFormModal plans={plans} onClose={() => setShow(false)} />}
    </>
  )
}
