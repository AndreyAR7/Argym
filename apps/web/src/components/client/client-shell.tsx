'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { ClientSidebar } from '@/components/client/sidebar'

interface ClientShellProps {
  children: React.ReactNode
  userName: string
  userEmail: string
  avatarUrl: string | null
}

export function ClientShell({ children, userName, userEmail, avatarUrl }: ClientShellProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-background)]">
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 md:relative md:z-auto md:inset-auto transition-transform duration-200 ease-in-out md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <ClientSidebar userName={userName} userEmail={userEmail} avatarUrl={avatarUrl} onClose={() => setOpen(false)} />
      </div>
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-[var(--color-border)] bg-[var(--color-card)] flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--color-client)' }}>
              <span className="text-white font-bold text-[10px]">A</span>
            </div>
            <span className="font-semibold text-sm">ARGYM</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  )
}
