'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Video,
  Dumbbell,
  CalendarDays,
  CreditCard,
  Tag,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Apple,
  X,
  Building2,
  Mail,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { logoutAction } from '@/lib/auth/actions'

interface SidebarProps {
  userName: string
  userEmail: string
  avatarUrl: string | null
  onClose?: () => void
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Sucursales', href: '/admin/branches', icon: Building2 },
      { label: 'Clientes', href: '/admin/clients', icon: Users },
      { label: 'Coaches', href: '/admin/coaches', icon: Users },
      { label: 'Aprobaciones', href: '/admin/approvals', icon: UserCheck },
    ],
  },
  {
    title: 'Contenido',
    items: [
      { label: 'Videos', href: '/admin/videos', icon: Video },
      { label: 'Rutinas', href: '/admin/routines', icon: Dumbbell },
      { label: 'Nutrición', href: '/admin/nutrition-plans', icon: Apple },
    ],
  },
  {
    title: 'Agenda',
    items: [
      { label: 'Citas', href: '/admin/appointments', icon: CalendarDays },
    ],
  },
  {
    title: 'Monetización',
    items: [
      { label: 'Planes', href: '/admin/plans', icon: CreditCard },
      { label: 'Promociones', href: '/admin/promotions', icon: Tag },
      { label: 'Facturación', href: '/admin/billing', icon: BarChart3 },
      { label: 'Analíticas', href: '/admin/analytics', icon: TrendingUp },
    ],
  },
  {
    title: 'Comunidad',
    items: [
      { label: 'Gamificación', href: '/admin/gamificacion', icon: Trophy },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { label: 'Correspondencia', href: '/admin/correspondencia', icon: Mail },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { label: 'Notificaciones', href: '/admin/notifications', icon: Bell },
      { label: 'Ajustes', href: '/admin/settings', icon: Settings },
    ],
  },
]

export function AdminSidebar({ userName, userEmail, avatarUrl, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <aside className="w-[240px] flex-shrink-0 flex flex-col h-full bg-[var(--color-sidebar)] border-r border-[var(--color-sidebar-border)]">
      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5" style={{ paddingTop: onClose ? '0' : '1rem', paddingBottom: '1rem' }}>
        {/* Mobile close button */}
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
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-2.5 md:py-1.5 rounded-md text-sm transition-all',
                        isActive
                          ? 'bg-[var(--color-admin-light)] text-[var(--color-admin)] font-medium'
                          : 'text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                      )}
                    >
                      <Icon
                        size={15}
                        className={cn(
                          'flex-shrink-0',
                          isActive ? 'text-[var(--color-admin)]' : 'text-[var(--color-sidebar-muted)]',
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="px-3 pb-4 pt-3 border-t border-[var(--color-sidebar-border)] flex-shrink-0 space-y-1">
        <Link
          href="/admin/profile"
          onClick={onClose}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--color-muted)] transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-[var(--color-admin-light)] flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-[var(--color-admin)]">
                {getInitials(userName)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--color-foreground)] truncate group-hover:text-[var(--color-admin)] transition-colors">{userName}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] truncate">{userEmail}</p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
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
