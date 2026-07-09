'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { LayoutDashboard, Users, Dumbbell, CalendarDays, Apple, LogOut, User, Video } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { logoutAction } from '@/lib/auth/actions'

interface SidebarProps {
  userName: string
  userEmail: string
  avatarUrl: string | null
}

const NAV = [
  {
    title: 'Principal',
    items: [{ label: 'Mi Panel', href: '/coach', icon: LayoutDashboard }],
  },
  {
    title: 'Mis Clientes',
    items: [{ label: 'Clientes', href: '/coach/clients', icon: Users }],
  },
  {
    title: 'Contenido',
    items: [
      { label: 'Rutinas', href: '/coach/routines', icon: Dumbbell },
      { label: 'Videos', href: '/coach/videos', icon: Video },
      { label: 'Nutrición', href: '/coach/nutrition', icon: Apple },
    ],
  },
  {
    title: 'Agenda',
    items: [{ label: 'Citas', href: '/coach/appointments', icon: CalendarDays }],
  },
  {
    title: 'Cuenta',
    items: [{ label: 'Mi Perfil', href: '/coach/profile', icon: User }],
  },
]

export function CoachSidebar({ userName, userEmail, avatarUrl }: SidebarProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  return (
    <aside className="w-[240px] flex-shrink-0 flex flex-col h-full bg-[var(--color-sidebar)] border-r border-[var(--color-sidebar-border)]">
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV.map((section) => (
          <div key={section.title}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-sidebar-muted)]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/coach' && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-all',
                        isActive
                          ? 'bg-[var(--color-coach-light)] text-[var(--color-coach)] font-medium'
                          : 'text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-muted)]',
                      )}
                    >
                      <Icon size={15} className={cn('flex-shrink-0', isActive ? 'text-[var(--color-coach)]' : 'text-[var(--color-sidebar-muted)]')} />
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
          <div className="w-7 h-7 rounded-full bg-[var(--color-coach-light)] flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-[var(--color-coach)]">{getInitials(userName)}</span>
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
