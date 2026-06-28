'use client'

import { useState, useTransition } from 'react'
import { MapPin, Loader2, ArrowRight } from 'lucide-react'
import { saveBranchAction } from '@/lib/auth/actions'

interface Branch {
  id: string
  name: string
  address: string | null
}

export function SelectBranchForm({ branches }: { branches: Branch[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSelect(branchId: string) {
    setSelected(branchId)
    setError(null)
    startTransition(async () => {
      const res = await saveBranchAction(branchId)
      if (res?.error) {
        setError('Ocurrió un error. Intenta de nuevo.')
        setSelected(null)
      }
    })
  }

  if (branches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No hay sedes disponibles. Contacta al administrador.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 px-4 py-3">
          <p className="text-sm text-[var(--color-destructive)]">{error}</p>
        </div>
      )}

      {branches.map((branch) => {
        const isSelecting = selected === branch.id && isPending

        return (
          <button
            key={branch.id}
            onClick={() => handleSelect(branch.id)}
            disabled={isPending}
            className="group w-full text-left rounded-xl border-2 p-4 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              borderColor: isSelecting
                ? 'var(--color-primary)'
                : 'var(--color-input)',
              backgroundColor: isSelecting
                ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-card))'
                : 'var(--color-card)',
            }}
            onMouseEnter={(e) => {
              if (!isPending) {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)'
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'color-mix(in srgb, var(--color-primary) 5%, var(--color-card))'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelecting) {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-input)'
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-card)'
              }
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--color-foreground)] text-base leading-tight">
                  {branch.name}
                </p>
                {branch.address && (
                  <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] mt-1">
                    <MapPin size={12} className="flex-shrink-0" />
                    {branch.address}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-[var(--color-muted-foreground)]">
                {isSelecting
                  ? <Loader2 size={18} className="animate-spin text-[var(--color-primary)]" />
                  : <ArrowRight size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                }
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
