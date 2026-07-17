'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Building2, LogOut, X, ArrowLeftRight } from 'lucide-react'
import { logoutAction } from '@/lib/auth/actions'
import { cn, getInitials } from '@/lib/utils'

interface SuperAdminSidebarProps {
  userName: string
  userEmail: string
  onClose?: () => void
}

const NAV = [
  { label: 'Gimnasios', href: '/super-admin/tenants', icon: Building2 },
]

export function SuperAdminSidebar({ userName, userEmail, onClose }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => { await logoutAction() })
  }

  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col h-full border-r"
      style={{ background: '#111111', borderColor: '#1f1f1f' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: '#1f1f1f' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#f97316', color: '#fff' }}
          >
            A
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: '#f0f0f0' }}>
            ARGYM HQ
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="w-6 h-6 flex items-center justify-center rounded md:hidden"
            style={{ color: '#737373' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <Link
          href="/admin/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5 px-2 py-2 md:py-1.5 rounded text-sm mb-3 transition-all"
          style={{ color: '#a3a3a3', background: '#1a1a1a' }}
        >
          <ArrowLeftRight size={14} className="flex-shrink-0" />
          Volver a la app
        </Link>

        <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#525252' }}>
          Plataforma
        </p>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-2 md:py-1.5 rounded text-sm transition-all',
                  )}
                  style={
                    isActive
                      ? { background: '#f9731620', color: '#f97316' }
                      : { color: '#a3a3a3' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLElement).style.background = '#1a1a1a'
                      ;(e.currentTarget as HTMLElement).style.color = '#e5e5e5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = '#a3a3a3'
                    }
                  }}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div
        className="px-2 pb-3 pt-2 border-t flex-shrink-0 space-y-0.5"
        style={{ borderColor: '#1f1f1f' }}
      >
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded" style={{ color: '#a3a3a3' }}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
            style={{ background: '#f9731620', color: '#f97316' }}
          >
            {getInitials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate" style={{ color: '#e5e5e5' }}>{userName}</p>
            <p className="text-[10px] truncate" style={{ color: '#525252' }}>{userEmail}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isPending}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-all disabled:opacity-50"
          style={{ color: '#737373' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
            ;(e.currentTarget as HTMLElement).style.background = '#ef444410'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = '#737373'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <LogOut size={13} className="flex-shrink-0" />
          {isPending ? 'Cerrando…' : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
