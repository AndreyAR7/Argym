'use client'

import { Menu } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { getInitials } from '@/lib/utils'

interface TopbarProps {
  onMenuOpen: () => void
  userName: string
  avatarUrl: string | null
  accentColor?: string
  brandLabel?: string
}

export function Topbar({
  onMenuOpen,
  userName,
  avatarUrl,
  accentColor = 'var(--color-admin)',
  brandLabel = 'ARGYM',
}: TopbarProps) {
  return (
    <header
      className="h-14 flex items-center justify-between px-4 flex-shrink-0 border-b"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
        zIndex: 30,
      }}
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
          <span
            className="font-semibold text-sm tracking-tight"
            style={{ color: 'var(--color-foreground)' }}
          >
            {brandLabel}
          </span>
        </div>
      </div>

      {/* Right — theme toggle + avatar */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
            style={{ background: accentColor }}
          >
            {getInitials(userName)}
          </div>
        )}
      </div>
    </header>
  )
}
