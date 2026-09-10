'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { X } from 'lucide-react'

interface Coach { id: string; full_name: string }

interface Props {
  defaultDate: string
  defaultCoach: string
  coaches: Coach[]
}

export function AppointmentListFilters({ defaultDate, defaultCoach, coaches }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') params.set(key, value)
      else params.delete(key)
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const hasFilters = !!defaultDate || (defaultCoach && defaultCoach !== 'all')

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('date')
    params.delete('coach')
    params.delete('page')
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="date"
        defaultValue={defaultDate}
        onChange={(e) => updateParam('date', e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 transition-all"
      />

      {coaches.length > 0 && (
        <select
          defaultValue={defaultCoach}
          onChange={(e) => updateParam('coach', e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 transition-all cursor-pointer"
        >
          <option value="all">Todos los coaches</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <X size={12} />
          Limpiar fecha/coach
        </button>
      )}
    </div>
  )
}
