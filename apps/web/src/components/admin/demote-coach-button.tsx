'use client'

import { useTransition } from 'react'
import { UserMinus, Loader2 } from 'lucide-react'
import { useConfirm } from '@/context/confirm-context'
import { demoteToClientAction } from '@/lib/admin/actions'
import { useRouter } from 'next/navigation'

interface Props {
  coachId: string
  coachName: string | null
}

export function DemoteCoachButton({ coachId, coachName }: Props) {
  const { confirm } = useConfirm()
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleDemote() {
    const ok = await confirm({
      title: 'Revertir a Cliente',
      message: `¿Estás seguro de revertir a "${coachName ?? 'este coach'}" al rol de Cliente? Perderá el acceso de coach y todas sus asignaciones de clientes.`,
      confirmLabel: 'Sí, revertir',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return

    startTransition(async () => {
      const res = await demoteToClientAction(coachId)
      if (res?.error) {
        alert(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleDemote}
      disabled={isPending}
      title="Revertir a cliente"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <UserMinus size={12} />
      )}
      Revertir
    </button>
  )
}
