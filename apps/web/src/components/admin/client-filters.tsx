'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClientFiltersProps {
  defaultSearch: string
  defaultLevel: string
  defaultStatus: string
  defaultBranch?: string
  branches?: { id: string; name: string }[]
}

const LEVELS = [
  { value: 'all',          label: 'Todos los niveles' },
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced',     label: 'Avanzado' },
  { value: 'none',         label: 'Sin nivel' },
]

const STATUSES = [
  { value: 'all',       label: 'Todos' },
  { value: 'approved',  label: 'Aprobados' },
  { value: 'pending',   label: 'Pendientes' },
  { value: 'rejected',  label: 'Rechazados' },
  { value: 'suspended', label: 'Suspendidos' },
]

export function ClientFilters({
  defaultSearch,
  defaultLevel,
  defaultStatus,
  defaultBranch = 'all',
  branches = [],
}: ClientFiltersProps) {
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

  const hasFilters =
    defaultSearch ||
    defaultLevel !== 'all' ||
    defaultStatus !== 'all' ||
    (defaultBranch && defaultBranch !== 'all')

  function clearAll() {
    router.replace(pathname, { scroll: false })
  }

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <input
          type="search"
          defaultValue={defaultSearch}
          onChange={(e) => updateParam('search', e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 transition-all"
        />
      </div>

      {/* Level filter */}
      <select
        defaultValue={defaultLevel}
        onChange={(e) => updateParam('level', e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 transition-all cursor-pointer"
      >
        {LEVELS.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>

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

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <X size={12} />
          Limpiar
        </button>
      )}
    </div>
  )
}
