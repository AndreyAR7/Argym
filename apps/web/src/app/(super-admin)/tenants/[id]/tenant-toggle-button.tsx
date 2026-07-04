'use client'

import { useTransition } from 'react'
import { toggleTenantActiveAction } from './actions'

interface Props {
  tenantId: string
  isActive: boolean
}

export function TenantToggleButton({ tenantId, isActive }: Props) {
  const [isPending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      await toggleTenantActiveAction(tenantId, !isActive)
    })
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={isPending}
      className="px-3.5 py-2 rounded-md text-xs font-medium transition-all disabled:opacity-40"
      style={
        isActive
          ? { background: '#1a1a1a', color: '#737373', border: '1px solid #2a2a2a' }
          : { background: '#f97316', color: '#fff' }
      }
    >
      {isPending ? '…' : isActive ? 'Desactivar' : 'Activar'}
    </button>
  )
}
