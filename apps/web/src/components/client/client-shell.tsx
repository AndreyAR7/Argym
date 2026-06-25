'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ClientSidebar } from '@/components/client/sidebar'
import { Topbar } from '@/components/shared/topbar'

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
    <div className="flex flex-col h-dvh overflow-hidden bg-[var(--color-background)]">
      {/* ── Topbar: full width ── */}
      <Topbar
        onMenuOpen={() => setOpen(true)}
        userName={userName}
        avatarUrl={avatarUrl}
        accentColor="var(--color-client)"
        brandLabel="ARGYM"
      />

      {/* ── Body: sidebar + main ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-200 ${
            open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 md:relative md:z-auto md:inset-auto transition-transform duration-200 ease-in-out md:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <ClientSidebar
            userName={userName}
            userEmail={userEmail}
            avatarUrl={avatarUrl}
            onClose={() => setOpen(false)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
