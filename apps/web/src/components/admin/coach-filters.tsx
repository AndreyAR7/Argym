'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoachFiltersProps {
  defaultSearch: string
  defaultStatus: string
  defaultBranch?: string
  branches?: { id: string; name: string }[]
}

const STATUSES = [
  { value: 'all',      label: 'Todos' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'pending',  label: 'Pendientes' },
  { value: 'rejected', label: 'Rechazados' },
]

export function CoachFilters({
  defaultSearch,
  defaultStatus,
  defaultBranch = 'all',
  branches = [],
}: CoachFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') params.set(key, value)
      else params.delete(key)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const hasFilters = defaultSearch || defaultStatus !== 'all' || (defaultBranch && defaultBranch !== 'all')

  return (
    <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <input
          type="search"
          defaultValue={defaultSearch}
          onChange={(e) => updateParam('search', e.target.value)}
          placeholder="Buscar coach..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 transition-all"
        />
      </div>

      {/* Branch filter */}
      {branches.length > 0 && (
        <select
          defaultValue={defaultBranch}
          onChange={(e) => updateParam('branch', e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 transition-all cursor-pointer"
        >
          <option value="all">Todas las sucursales</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => updateParam('status', s.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              defaultStatus === s.value || (s.value === 'all' && !defaultStatus)
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={() => router.replace(pathname, { scroll: false })}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <X size={12} />
          Limpiar
        </button>
      )}
    </div>
  )
}
