'use client'

import { useState, useTransition } from 'react'
import { ArrowRight, Dumbbell } from 'lucide-react'
import { switchActiveTenantAction } from '@/lib/auth/actions'

interface Gym {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

export function SelectGymPicker({ gyms }: { gyms: Gym[] }) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function choose(gymId: string) {
    setError(null)
    setPendingId(gymId)
    startTransition(async () => {
      const result = await switchActiveTenantAction(gymId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 px-4 py-3">
          <p className="text-sm text-[var(--color-destructive)]">{error}</p>
        </div>
      )}

      {gyms.map((gym) => (
        <button
          key={gym.id}
          onClick={() => choose(gym.id)}
          disabled={isPending}
          className="group w-full text-left rounded-xl border-2 p-4 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--color-input)', backgroundColor: 'var(--color-card)' }}
          onMouseEnter={(e) => {
            if (isPending) return
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)'
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'color-mix(in srgb, var(--color-primary) 5%, var(--color-card))'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-input)'
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-card)'
          }}
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
        </button>
      ))}
    </div>
  )
}
