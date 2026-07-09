'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Home, Dumbbell, Video, CalendarDays, Apple, TrendingUp, CreditCard, User, LogOut, X, Sparkles, Trophy, BarChart3, Medal, Swords, QrCode } from 'lucide-react'
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
    items: [
      { label: 'Check-in QR', href: '/client/checkin-scan', icon: QrCode },
      { label: 'Mis Citas', href: '/client/appointments', icon: CalendarDays },
    ],
  },
  {
    title: 'Salud',
    items: [
      { label: 'Nutrición', href: '/client/nutrition', icon: Apple },
      { label: 'Progreso', href: '/client/progress', icon: TrendingUp },
    ],
  },
  {
    title: 'Comunidad',
    items: [
      { label: 'Gamificación', href: '/client/gamificacion', icon: Trophy },
      { label: 'Ranking', href: '/client/gamificacion/ranking', icon: BarChart3 },
      { label: 'Logros', href: '/client/gamificacion/logros', icon: Medal },
      { label: 'Retos', href: '/client/gamificacion/retos', icon: Swords },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { label: 'Planes', href: '/client/planes', icon: Sparkles },
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
      <nav className="flex-1 overflow-y-auto px-3 space-y-5" style={{ paddingTop: onClose ? '0' : '1rem', paddingBottom: '1rem' }}>
        {onClose && (
          <div className="flex items-center justify-end pt-3 pb-1 md:hidden">
            <button
              onClick={onClose}
              aria-label="Cerrar menú"
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-sidebar-muted)] hover:bg-[var(--color-muted)] transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        )}
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
