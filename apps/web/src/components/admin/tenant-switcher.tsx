'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { ShieldCheck, RotateCcw } from 'lucide-react'
import { switchActiveTenantAction } from '@/lib/auth/actions'

interface TenantOption {
  id: string
  name: string
}

export function TenantSwitcher({
  tenants,
  currentTenantId,
  homeTenantId,
  onNavigate,
}: {
  tenants: TenantOption[]
  currentTenantId: string
  homeTenantId: string | null
  onNavigate?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function switchTo(tenantId: string) {
    if (tenantId === currentTenantId) return
    startTransition(async () => {
      await switchActiveTenantAction(tenantId)
    })
    onNavigate?.()
  }

  return (
    <div className="px-3 pb-1 flex-shrink-0 space-y-1.5">
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold" style={{ background: '#f9731620', color: '#f97316' }}>
        <ShieldCheck size={14} className="flex-shrink-0" />
        ARGYM HQ
      </div>

      <select
        value={currentTenantId}
        disabled={isPending}
        onChange={(e) => switchTo(e.target.value)}
        className="w-full rounded-md border text-xs px-2 py-1.5 outline-none disabled:opacity-50"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      {homeTenantId && currentTenantId !== homeTenantId && (
        <button
          type="button"
          onClick={() => switchTo(homeTenantId)}
          disabled={isPending}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          style={{ color: 'var(--color-sidebar-muted)' }}
        >
          <RotateCcw size={12} className="flex-shrink-0" />
          Volver a mi gimnasio
        </button>
      )}

      <Link
        href="/super-admin/tenants"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--color-muted)]"
        style={{ color: 'var(--color-sidebar-muted)' }}
      >
        Gestionar gimnasios
      </Link>
    </div>
  )
}
