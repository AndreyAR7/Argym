'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Dumbbell } from 'lucide-react'

interface Gym {
  slug: string
  name: string
  logo_url: string | null
}

export function GymPicker({
  gyms,
  mode,
}: {
  gyms: Gym[]
  mode: 'select-branch' | 'register'
}) {
  const router = useRouter()

  function hrefFor(slug: string) {
    return mode === 'register' ? `/register/${slug}` : `/select-branch?slug=${slug}`
  }

  if (gyms.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No hay gimnasios disponibles. Contacta al administrador.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {gyms.map((gym) => (
        <button
          key={gym.slug}
          onClick={() => router.push(hrefFor(gym.slug))}
          className="group w-full text-left rounded-xl border-2 p-4 transition-all duration-150"
          style={{ borderColor: 'var(--color-input)', backgroundColor: 'var(--color-card)' }}
          onMouseEnter={(e) => {
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
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: 'var(--color-muted)' }}
              >
                {gym.logo_url ? (
                  <img src={gym.logo_url} alt={gym.name} className="w-full h-full object-cover" />
                ) : (
                  <Dumbbell size={16} className="text-[var(--color-muted-foreground)]" />
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
