'use client'

import { useState, useMemo } from 'react'
import { Building2, MapPin, Phone, Mail, Users2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BranchActions } from '@/components/admin/branch-actions'
import { Search, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Branch = {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  coach_count?: number | null
  client_count?: number | null
}

const PAGE_SIZE = 12

export function BranchesListClient({ branches }: { branches: Branch[] }) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(
    () =>
      branches.filter(
        b =>
          !q ||
          b.name.toLowerCase().includes(q.toLowerCase()) ||
          b.address?.toLowerCase().includes(q.toLowerCase()),
      ),
    [branches, q],
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from = (page - 1) * PAGE_SIZE + 1
  const to   = Math.min(page * PAGE_SIZE, filtered.length)

  function handleSearch(val: string) {
    setQ(val)
    setPage(1)
  }

  return (
    <>
      {/* Search */}
      <div className="mt-4 relative group max-w-xs">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-muted-foreground)] group-focus-within:text-[var(--color-foreground)] transition-colors"
        />
        <input
          type="text"
          value={q}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar sucursal..."
          className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 focus:bg-[var(--color-card)] transition-all"
        />
        {q && (
          <button
            type="button"
            onClick={() => handleSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Building2 size={36} className="text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {q ? `Sin resultados para "${q}"` : 'No hay sucursales'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginated.map(branch => (
              <div
                key={branch.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-[var(--color-foreground)]">{branch.name}</span>
                    <Badge value={branch.is_active ? 'approved' : 'inactive'} />
                  </div>
                  <BranchActions branch={branch} />
                </div>

                <div className="space-y-1">
                  {branch.address && (
                    <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                      <MapPin size={13} className="shrink-0" />
                      {branch.address}
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                      <Phone size={13} className="shrink-0" />
                      {branch.phone}
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                      <Mail size={13} className="shrink-0" />
                      {branch.email}
                    </div>
                  )}
                  {!branch.address && !branch.phone && !branch.email && (
                    <p className="text-xs text-[var(--color-muted-foreground)] italic">Sin información de contacto</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-coach-light)', color: 'var(--color-coach)' }}
                  >
                    <Users2 size={11} />
                    {branch.coach_count ?? 0} coaches
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-client-light)', color: 'var(--color-client)' }}
                  >
                    <Users2 size={11} />
                    {branch.client_count ?? 0} clientes
                  </span>
                </div>

                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Creada {formatDate(branch.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 gap-4 flex-wrap">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {from}–{to} de {filtered.length} sucursal{filtered.length !== 1 ? 'es' : ''}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md hover:bg-[var(--color-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-[2rem] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'hover:bg-[var(--color-muted)] text-[var(--color-foreground)]'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md hover:bg-[var(--color-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </>
  )
}
