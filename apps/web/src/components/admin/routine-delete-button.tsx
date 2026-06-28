'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteRoutineAction } from '@/lib/admin/exercise-actions'
import { useConfirm } from '@/context/confirm-context'
import { useToast } from '@/context/toast-context'

interface Props {
  routineId: string
  routineName: string
}

export function RoutineDeleteButton({ routineId, routineName }: Props) {
  const [isPending, startTransition] = useTransition()
  const { confirm } = useConfirm()
  const { showToast } = useToast()

  function handleDelete() {
    startTransition(async () => {
      const ok = await confirm({
        title: 'Eliminar rutina',
        message: `¿Eliminar "${routineName}"? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return

      const result = await deleteRoutineAction(routineId)
      if (result?.error) {
        showToast('error', `No se pudo eliminar la rutina: ${result.error}`)
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
