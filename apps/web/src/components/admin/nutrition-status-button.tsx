'use client'

import { useState, useTransition } from 'react'
import { Eye, Archive, RotateCcw } from 'lucide-react'
import { updateNutritionStatusAction } from '@/lib/admin/content-actions'

export function NutritionStatusButton({ planId, status }: { planId: string; status: string }) {
  const [current, setCurrent] = useState(status)
  const [isPending, startTransition] = useTransition()

  function changeStatus(next: 'published' | 'archived' | 'draft') {
    startTransition(async () => {
      const result = await updateNutritionStatusAction(planId, next)
      if (!result?.error) setCurrent(next)
    })
  }

  if (current === 'draft') {
    return (
      <button onClick={() => changeStatus('published')} disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40">
        <Eye size={12} />{isPending ? '…' : 'Publicar'}
      </button>
    )
  }
  if (current === 'published') {
    return (
      <button onClick={() => changeStatus('archived')} disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted-foreground)] hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40">
        <Archive size={12} />{isPending ? '…' : 'Archivar'}
      </button>
    )
  }
  if (current === 'archived') {
    return (
      <button onClick={() => changeStatus('draft')} disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-40">
        <RotateCcw size={12} />{isPending ? '…' : 'Restaurar'}
      </button>
    )
  }
  return null
}
