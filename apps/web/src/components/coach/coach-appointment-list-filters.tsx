'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { X } from 'lucide-react'

interface Props {
  defaultFrom: string
  defaultTo: string
  isDefaultToday: boolean
}

export function CoachAppointmentListFilters({ defaultFrom, defaultTo, isDefaultToday }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }
      params.delete('page')
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  function resetToToday() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('from')
    params.delete('to')
    params.delete('page')
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-[var(--color-muted-foreground)]">Desde</label>
        <input
          type="date"
          value={defaultFrom}
          onChange={(e) => updateParams({ from: e.target.value, to: defaultTo && defaultTo >= e.target.value ? defaultTo : e.target.value })}
          className="px-2.5 py-1.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 transition-all"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-[var(--color-muted-foreground)]">Hasta</label>
        <input
          type="date"
          value={defaultTo}
          min={defaultFrom}
          onChange={(e) => updateParams({ to: e.target.value })}
          className="px-2.5 py-1.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 transition-all"
        />
      </div>

      {isDefaultToday && (
        <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-[var(--color-coach-light)] text-[var(--color-coach)]">
          Mostrando hoy
        </span>
      )}

      {!isDefaultToday && (
        <button
          onClick={resetToToday}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <X size={12} />
          Volver a hoy
        </button>
      )}
    </div>
  )
}
