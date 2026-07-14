'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Search, UserCheck, Loader2, CheckCircle2 } from 'lucide-react'
import { getClientsForElevationAction, elevateToCoachAction } from '@/lib/admin/actions'
import { useConfirm } from '@/context/confirm-context'

interface Client {
  id: string
  full_name: string | null
  phone: string | null
}

export function ElevateCoachButton() {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [elevating, setElevating] = useState<string | null>(null)
  const [elevated, setElevated] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const { confirm } = useConfirm()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getClientsForElevationAction().then((res) => {
      setClients(res.clients)
      setLoading(false)
    })
  }, [open])

  function close() {
    setOpen(false)
    setSearch('')
    setError(null)
  }

  const filtered = clients.filter(
    (c) => !elevated.has(c.id) && (!search || c.full_name?.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleElevate(client: Client) {
    const ok = await confirm({
      title: 'Elevar a Coach',
      message: `¿Estás seguro de elevar a "${client.full_name ?? 'este usuario'}" al rol de Coach? Perderá el acceso de cliente.`,
      confirmLabel: 'Sí, elevar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return

    setElevating(client.id)
    setError(null)
    startTransition(async () => {
      const res = await elevateToCoachAction(client.id)
      if (res?.error) {
        setError(res.error)
      } else {
        setElevated((prev) => new Set([...prev, client.id]))
      }
      setElevating(null)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
      >
        <UserCheck size={14} />
        Elevar usuario existente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <div>
                <p className="font-bold text-[var(--color-foreground)]">Elevar cliente a Coach</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  El cliente perderá el rol de cliente y pasará a ser coach
                </p>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="w-full pl-8 pr-4 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                  {error}
                </p>
              )}

              {/* Client list */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5">
                {loading ? (
                  <div className="py-10 flex flex-col items-center gap-2 text-[var(--color-muted-foreground)]">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-xs">Cargando clientes…</span>
                  </div>
                ) : elevated.size > 0 && filtered.length === 0 && !search ? (
                  <div className="py-10 text-center">
                    <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" />
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {elevated.size === 1 ? 'Usuario elevado exitosamente' : `${elevated.size} usuarios elevados`}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                      Ya aparecen en la lista de coaches
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                    {search ? `Sin resultados para "${search}"` : 'No hay clientes disponibles para elevar'}
                  </div>
                ) : (
                  filtered.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                          {client.full_name ?? '—'}
                        </p>
                        {client.phone && (
                          <p className="text-xs text-[var(--color-muted-foreground)]">{client.phone}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleElevate(client)}
                        disabled={elevating === client.id}
                        className="ml-3 flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {elevating === client.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <UserCheck size={12} />
                        }
                        Elevar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end">
              <button
                onClick={close}
                className="px-4 py-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
