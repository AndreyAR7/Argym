'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { getCoachClientsAction, assignRoutineAction } from './actions'

interface Client {
  id: string
  full_name: string
  client_level: string | null
}

interface Props {
  routineId: string
  routineName: string
}

export function AssignRoutineButton({ routineId, routineName }: Props) {
  const [isOpen, setIsOpen]               = useState(false)
  const [clients, setClients]             = useState<Client[] | null>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [isLoading, setIsLoading]         = useState(false)
  const [isPending, startTransition]      = useTransition()
  const [success, setSuccess]             = useState<string | null>(null)
  const [error, setError]                 = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Load clients on first open
  useEffect(() => {
    if (!isOpen || clients !== null) return
    setIsLoading(true)
    getCoachClientsAction().then(({ data, error: err }) => {
      setClients(data ?? [])
      if (err) setError(err)
      if (data && data.length > 0) setSelectedClientId(data[0].id)
      setIsLoading(false)
    })
  }, [isOpen, clients])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [isOpen])

  function handleClose() {
    setIsOpen(false)
    setSuccess(null)
    setError(null)
  }

  function handleAssign() {
    if (!selectedClientId) return
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await assignRoutineAction(routineId, selectedClientId)
      if (result.success) {
        const clientName = clients?.find(c => c.id === selectedClientId)?.full_name ?? 'cliente'
        setSuccess(`Asignado a ${clientName}`)
        setTimeout(() => handleClose(), 2000)
      } else {
        setError(result.error ?? 'Error al asignar')
      }
    })
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev)
          setSuccess(null)
          setError(null)
        }}
        className="px-2.5 py-1.5 rounded-lg border border-[var(--color-coach)] text-[var(--color-coach)] text-xs font-medium hover:bg-[var(--color-coach-light)] transition-colors"
      >
        Asignar ↓
      </button>

      {/* Popover card */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg p-3">
          <p className="text-xs font-semibold text-[var(--color-muted-foreground)] mb-2 truncate">
            {routineName}
          </p>

          {isLoading ? (
            <p className="text-xs text-[var(--color-muted-foreground)] py-2 text-center">
              Cargando clientes…
            </p>
          ) : clients && clients.length === 0 ? (
            <p className="text-xs text-[var(--color-muted-foreground)] py-2 text-center">
              Sin clientes asignados
            </p>
          ) : (
            <>
              <label className="block text-xs text-[var(--color-muted-foreground)] mb-1">
                Asignar a:
              </label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1.5 text-xs text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-coach)] disabled:opacity-50"
              >
                {clients?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                    {c.client_level ? ` (${c.client_level})` : ''}
                  </option>
                ))}
              </select>

              {success ? (
                <p className="mt-2 text-xs font-medium text-green-600">
                  ✓ {success}
                </p>
              ) : (
                <>
                  {error && (
                    <p className="mt-2 text-xs text-red-500">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={isPending || !selectedClientId}
                    className="mt-2 w-full rounded-lg bg-[var(--color-coach)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isPending ? 'Asignando…' : 'Asignar'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
