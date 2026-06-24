'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Home, Dumbbell, Video, CalendarDays, Apple, TrendingUp, CreditCard, User, LogOut, X } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { logoutAction } from '@/lib/auth/actions'

interface SidebarProps {
  userName: string
  userEmail: string
  avatarUrl: string | null
  onClose?: () => void
}

const NAV = [
  {
    title: 'Principal',
    items: [{ label: 'Inicio', href: '/client/inicio', icon: Home }],
  },
  {
    title: 'Mi Entrenamiento',
    items: [
      { label: 'Rutinas', href: '/client/routine', icon: Dumbbell },
      { label: 'Videos', href: '/client/videos', icon: Video },
    ],
  },
  {
    title: 'Agenda',
    items: [{ label: 'Mis Citas', href: '/client/appointments', icon: CalendarDays }],
  },
  {
    title: 'Salud',
    items: [
      { label: 'Nutrición', href: '/client/nutrition', icon: Apple },
      { label: 'Progreso', href: '/client/progress', icon: TrendingUp },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { label: 'Mi Suscripción', href: '/client/subscription', icon: CreditCard },
      { label: 'Perfil', href: '/client/profile', icon: User },
    ],
  },
]

export function ClientSidebar({ userName, userEmail, avatarUrl, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  return (
    <aside className="w-[240px] flex-shrink-0 flex flex-col h-full bg-[var(--color-sidebar)] border-r border-[var(--color-sidebar-border)]">
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[var(--color-sidebar-border)] flex-shrink-0">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-client)' }}
        >
          <span className="text-white font-bold text-xs">A</span>
        </div>
        <span className="font-semibold text-[15px] tracking-tight text-[var(--color-sidebar-foreground)] flex-1">
          ARGYM
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="md:hidden w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-sidebar-muted)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV.map((section) => (
          <div key={section.title}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-sidebar-muted)]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/client/inicio' && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-2.5 md:py-1.5 rounded-md text-sm transition-all',
                        isActive
                          ? 'bg-[var(--color-client-light)] text-[var(--color-client)] font-medium'
                          : 'text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-muted)]',
                      )}
                    >
                      <Icon size={15} className={cn('flex-shrink-0', isActive ? 'text-[var(--color-client)]' : 'text-[var(--color-sidebar-muted)]')} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-[var(--color-sidebar-border)] flex-shrink-0 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
          <div className="w-7 h-7 rounded-full bg-[var(--color-client-light)] flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-[var(--color-client)]">{getInitials(userName)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--color-foreground)] truncate">{userName}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={() => startTransition(async () => { await logoutAction() })}
          disabled={isPending}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-[var(--color-sidebar-muted)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/5 transition-all disabled:opacity-50"
        >
          <LogOut size={15} className="flex-shrink-0" />
          {isPending ? 'Cerrando…' : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
