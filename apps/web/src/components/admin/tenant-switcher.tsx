'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, RotateCcw, Loader2 } from 'lucide-react'

interface TenantOption {
  id: string
  name: string
}

export function TenantSwitcher({
  tenants,
  currentTenantId,
  homeTenantId,
}: {
  tenants: TenantOption[]
  currentTenantId: string
  homeTenantId: string | null
  onNavigate?: () => void
}) {
  const [switching, setSwitching] = useState(false)

  // Plain navigation to a Route Handler (not a Server Action) — Server
  // Actions that set cookies and then redirect() can silently drop the
  // Set-Cookie header in Next.js 15; a Route Handler building the redirect
  // response directly does not have this problem.
  function switchHref(tenantId: string) {
    return `/api/switch-gym?tenantId=${tenantId}`
  }

  function goTo(tenantId: string) {
    if (switching) return
    setSwitching(true)
    window.location.href = switchHref(tenantId)
  }

  return (
    <div className="px-3 pb-1 flex-shrink-0 space-y-1.5">
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold" style={{ background: '#f9731620', color: '#f97316' }}>
        <ShieldCheck size={14} className="flex-shrink-0" />
        ARGYM HQ
      </div>

      <div className="relative">
        <select
          value={currentTenantId}
          disabled={switching}
          onChange={(e) => goTo(e.target.value)}
          className="w-full rounded-md border text-xs px-2 py-1.5 outline-none disabled:opacity-50"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {switching && (
          <Loader2 size={12} className="animate-spin absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
        )}
      </div>

      {homeTenantId && currentTenantId !== homeTenantId && (
        <button
          type="button"
          onClick={() => goTo(homeTenantId)}
          disabled={switching}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          style={{ color: 'var(--color-sidebar-muted)' }}
        >
          <RotateCcw size={12} className="flex-shrink-0" />
          Volver a mi gimnasio
        </button>
      )}

      <Link
        href="/super-admin/tenants"
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--color-muted)]"
        style={{ color: 'var(--color-sidebar-muted)' }}
      >
        Gestionar gimnasios
      </Link>
    </div>
  )
}
