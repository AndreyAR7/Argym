'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowRight, Dumbbell } from 'lucide-react'

interface Gym {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

function SwitchError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  if (!error) return null
  return (
    <div className="rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 px-4 py-3 mb-4">
      <p className="text-sm text-[var(--color-destructive)]">{error}</p>
    </div>
  )
}

export function SelectGymList({ gyms }: { gyms: Gym[] }) {
  if (gyms.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No hay gimnasios disponibles.
        </p>
      </div>
    )
  }

  return (
    <div>
      <Suspense fallback={null}>
        <SwitchError />
      </Suspense>

      <div className="space-y-3">
        {gyms.map((gym) => (
          // Plain link to a Route Handler (not a Server Action) — Server
          // Actions that set cookies and then redirect() can silently drop
          // the Set-Cookie header in Next.js 15; a Route Handler building
          // the redirect response directly does not have this problem.
          <a
            key={gym.id}
            href={`/api/switch-gym?tenantId=${gym.id}`}
            className="group block w-full text-left rounded-xl border-2 p-4 transition-all duration-150"
            style={{ borderColor: 'var(--color-input)', backgroundColor: 'var(--color-card)' }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: 'var(--color-muted)' }}
                >
                  {gym.logo_url ? (
                    <img src={gym.logo_url} alt={gym.name} className="w-full h-full object-cover" />
                  ) : (
                    <Dumbbell size={18} className="text-[var(--color-muted-foreground)]" />
                  )}
                </div>
                <p className="font-semibold text-[var(--color-foreground)] text-base leading-tight truncate">
                  {gym.name}
                </p>
              </div>
              <ArrowRight size={18} className="flex-shrink-0 text-[var(--color-muted-foreground)] opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
