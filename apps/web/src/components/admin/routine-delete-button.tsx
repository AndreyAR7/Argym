'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteRoutineAction } from '@/lib/admin/exercise-actions'

interface Props {
  routineId: string
  routineName: string
}

export function RoutineDeleteButton({ routineId, routineName }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm(`Eliminar la rutina "${routineName}"? Esta accion no se puede deshacer.`)) return

    startTransition(async () => {
      const result = await deleteRoutineAction(routineId)
      if (result?.error) {
        window.alert(`No se pudo eliminar la rutina: ${result.error}`)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Eliminar rutina"
      className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-admin)] hover:border-[var(--color-admin)] transition-colors disabled:opacity-40"
    >
      <Trash2 size={14} />
    </button>
  )
}
