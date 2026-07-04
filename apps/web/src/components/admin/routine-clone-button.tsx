'use client'

import { useTransition } from 'react'
import { Copy } from 'lucide-react'
import { cloneRoutineAction } from '@/lib/admin/exercise-actions'
import { useToast } from '@/context/toast-context'

interface Props {
  routineId: string
  routineName: string
}

export function RoutineCloneButton({ routineId, routineName }: Props) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  function handleClone() {
    startTransition(async () => {
      const result = await cloneRoutineAction(routineId)
      if (result.success) {
        showToast('success', `Copia de "${routineName}" creada`)
      } else {
        showToast('error', result.error ?? 'No se pudo copiar la rutina')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClone}
      disabled={isPending}
      aria-label="Duplicar rutina"
      title="Duplicar rutina"
      className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-admin)] hover:border-[var(--color-admin)] transition-colors disabled:opacity-40"
    >
      <Copy size={14} />
    </button>
  )
}
