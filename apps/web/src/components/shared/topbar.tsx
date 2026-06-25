'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import {
  Menu, ChevronDown, User, HelpCircle, Mail, LogOut,
  Sun, Moon, Monitor,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme, type Theme } from './theme-provider'
import { getInitials } from '@/lib/utils'
import { logoutAction } from '@/lib/auth/actions'

const THEME_OPTIONS: { value: Theme; Icon: React.ElementType; label: string }[] = [
  { value: 'light',  Icon: Sun,     label: 'Claro'   },
  { value: 'dark',   Icon: Moon,    label: 'Oscuro'  },
  { value: 'system', Icon: Monitor, label: 'Sistema' },
]

interface TopbarProps {
  onMenuOpen: () => void
  userName: string
  userEmail: string
  avatarUrl: string | null
  accentColor?: string
  brandLabel?: string
  profileHref?: string
  helpHref?: string
  contactHref?: string
}

export function Topbar({
  onMenuOpen,
  userName,
  userEmail,
  avatarUrl,
  accentColor = 'var(--color-admin)',
  brandLabel = 'ARGYM',
  profileHref = '#',
  helpHref = '#',
  contactHref = '#',
}: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function handleLogout() {
    startTransition(async () => { await logoutAction() })
  }

  return (
    <header
      className="h-14 flex items-center justify-between px-4 flex-shrink-0 border-b"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', zIndex: 30 }}
    >
      {/* Left — hamburger (mobile) + brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          aria-label="Abrir menú"
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-muted)]"
          style={{ color: 'var(--color-foreground)' }}
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: accentColor }}
          >
            <span className="text-white font-bold text-[10px]">A</span>
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            {brandLabel}
          </span>
        </div>
      </div>

      {/* Right — user dropdown */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--color-muted)]"
          style={{ color: 'var(--color-foreground)' }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
              style={{ background: accentColor }}
            >
              {getInitials(userName)}
            </div>
          )}
          <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{userName}</span>
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-muted-foreground)' }}
          />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            className="absolute right-0 top-full mt-1.5 w-56 rounded-xl shadow-xl border overflow-hidden z-50"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            {/* User info */}
            <div className="px-3.5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>{userName}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{userEmail}</p>
            </div>

            {/* Profile */}
            <div className="py-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <Link
                href={profileHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-[var(--color-muted)]"
                style={{ color: 'var(--color-foreground)' }}
              >
                <User size={14} style={{ color: 'var(--color-muted-foreground)' }} />
                Mi perfil
              </Link>
            </div>

            {/* Theme */}
            <div className="px-3.5 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
                Tema
              </p>
              <div className="flex gap-1">
                {THEME_OPTIONS.map(({ value, Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    title={label}
                    className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                    style={
                      theme === value
                        ? { backgroundColor: accentColor, color: 'white' }
                        : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }
                    }
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Help & Contact */}
            <div className="py-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <Link
                href={helpHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-[var(--color-muted)]"
                style={{ color: 'var(--color-foreground)' }}
              >
                <HelpCircle size={14} style={{ color: 'var(--color-muted-foreground)' }} />
                Ayuda
              </Link>
              <Link
                href={contactHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-[var(--color-muted)]"
                style={{ color: 'var(--color-foreground)' }}
              >
                <Mail size={14} style={{ color: 'var(--color-muted-foreground)' }} />
                Contáctenos
              </Link>
            </div>

            {/* Logout */}
            <div className="py-1">
              <button
                onClick={handleLogout}
                disabled={isPending}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-[var(--color-destructive)]/8 disabled:opacity-50"
                style={{ color: 'var(--color-destructive)' }}
              >
                <LogOut size={14} />
                {isPending ? 'Cerrando…' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
