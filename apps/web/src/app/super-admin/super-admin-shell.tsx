'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SuperAdminSidebar } from './super-admin-sidebar'

interface SuperAdminShellProps {
  children: React.ReactNode
  userName: string
  userEmail: string
}

export function SuperAdminShell({ children, userName, userEmail }: SuperAdminShellProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: '#0a0a0a', color: '#e5e5e5' }}>
      {/* Mobile overlay */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={[
          'fixed inset-0 z-40 bg-black/60 md:hidden',
          'transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Sidebar */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 flex-shrink-0',
          'md:relative md:z-auto md:inset-auto',
          'transition-transform duration-200 ease-in-out',
          'md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <SuperAdminSidebar
          userName={userName}
          userEmail={userEmail}
          onClose={() => setOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 px-4 py-3 md:hidden border-b" style={{ borderColor: '#1f1f1f' }}>
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold tracking-tight" style={{ color: '#f97316' }}>ARGYM HQ</span>
        </div>

        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
