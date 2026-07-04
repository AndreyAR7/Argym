'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { getCoachClientsAction, assignVideoAction } from './actions'

interface Props {
  videoId: string
  videoTitle: string
}

type Client = { id: string; full_name: string | null }

export function AssignVideoButton({ videoId, videoTitle }: Props) {
  const [open, setOpen]         = useState(false)
  const [clients, setClients]   = useState<Client[] | null>(null)
  const [loading, setLoading]   = useState(false)
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientId, setClientId] = useState('')
  const [note, setNote]         = useState('')
  const [status, setStatus]     = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleOpen() {
    if (open) {
      setOpen(false)
      setStatus(null)
      return
    }

    setOpen(true)
    setStatus(null)

    if (!clients) {
      setClientsLoading(true)
      const result = await getCoachClientsAction()
      setClientsLoading(false)
      if (result.success) {
        setClients(result.clients ?? [])
        setClientId(result.clients?.[0]?.id ?? '')
      } else {
        setStatus({ type: 'error', message: result.error ?? 'Error al cargar clientes.' })
      }
    }
  }

  async function handleAssign() {
    if (!clientId) return
    setLoading(true)
    setStatus(null)

    const result = await assignVideoAction(videoId, clientId, note.trim() || undefined)
    setLoading(false)

    if (result.success) {
      setStatus({ type: 'success', message: 'Video asignado correctamente.' })
      setNote('')
      setTimeout(() => {
        setOpen(false)
        setStatus(null)
      }, 2000)
    } else {
      setStatus({ type: 'error', message: result.error ?? 'Error al asignar el video.' })
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      {/* Toggle button */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-card)] hover:bg-[var(--color-muted)] transition-colors text-left"
      >
        <span className="text-xs font-semibold text-[var(--color-coach)]">
          Asignar ↓
        </span>
        {open
          ? <ChevronUp size={14} className="text-[var(--color-muted-foreground)]" />
          : <ChevronDown size={14} className="text-[var(--color-muted-foreground)]" />
        }
      </button>

      {/* Popover card */}
      {open && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-card)] p-3 space-y-3">
          <p className="text-xs font-medium text-[var(--color-foreground)] line-clamp-1">{videoTitle}</p>

          {/* Client select */}
          {clientsLoading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              <Loader2 size={12} className="animate-spin" />
              Cargando clientes...
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-muted-foreground)]">Cliente</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)]"
              >
                {(clients ?? []).length === 0 ? (
                  <option value="">Sin clientes asignados</option>
                ) : (
                  (clients ?? []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name ?? c.id}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Note */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-muted-foreground)]">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Ver antes del entreno"
              className="px-2.5 py-1.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)]"
            />
          </div>

          {/* Status */}
          {status && (
            <div className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-2 ${
              status.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
            }`}>
              {status.type === 'success'
                ? <CheckCircle2 size={12} className="flex-shrink-0" />
                : <AlertCircle size={12} className="flex-shrink-0" />
              }
              {status.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleAssign}
              disabled={loading || !clientId || clientsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-coach)] text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loading && <Loader2 size={11} className="animate-spin" />}
              {loading ? 'Asignando...' : 'Asignar'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setStatus(null) }}
              className="px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
