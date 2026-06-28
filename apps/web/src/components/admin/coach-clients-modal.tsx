'use client'

import { useState, useTransition, useEffect } from 'react'
import { Users, X, AlertTriangle, Check, Loader2, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import {
  getCoachBranchClientsAction,
  toggleCoachClientAction,
  type CoachBranchClient,
} from '@/lib/admin/coach-actions'
import { useToast } from '@/context/toast-context'

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
}

interface Props {
  coach: { id: string; full_name: string | null }
  onClose: () => void
}

export function CoachClientsModal({ coach, onClose }: Props) {
  const [clients, setClients] = useState<CoachBranchClient[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  useEffect(() => {
    getCoachBranchClientsAction(coach.id).then(res => {
      setLoading(false)
      if (res.error) setFetchError(res.error)
      else setClients(res.clients ?? [])
    })
  }, [coach.id])

  function handleToggle(client: CoachBranchClient) {
    const willAssign = !client.assigned
    setPendingId(client.id)
    startTransition(async () => {
      const res = await toggleCoachClientAction(coach.id, client.id, willAssign)
      setPendingId(null)
      if (res.error) {
        showToast('error', res.error)
      } else {
        setClients(prev =>
          prev.map(c => c.id === client.id ? { ...c, assigned: willAssign } : c)
        )
        showToast(
          'success',
          willAssign
            ? `${client.full_name ?? 'Cliente'} asignado a ${coach.full_name ?? 'coach'}`
            : `${client.full_name ?? 'Cliente'} desasignado`,
        )
      }
    })
  }

  const assigned = clients.filter(c => c.assigned)
  const unassigned = clients.filter(c => !c.assigned)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col"
        style={{
          backgroundColor: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          maxHeight: '85vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <UserPlus size={18} style={{ color: 'var(--color-coach)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                Clientes de {coach.full_name ?? 'Coach'}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Clientes disponibles en la sucursal del coach
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:opacity-70"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-muted-foreground)' }} />
            </div>
          ) : fetchError ? (
            <div
              className="flex items-start gap-2.5 rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--color-destructive)', backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)' }}
            >
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-destructive)' }} />
              <p className="text-sm" style={{ color: 'var(--color-destructive)' }}>{fetchError}</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Users size={28} style={{ color: 'var(--color-border)' }} />
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                No hay clientes en la sucursal de este coach.
              </p>
            </div>
          ) : (
            <>
              {/* Assigned */}
              {assigned.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--color-muted-foreground)' }}>
                    Asignados ({assigned.length})
                  </p>
                  <div className="space-y-1.5">
                    {assigned.map(client => (
                      <ClientRow
                        key={client.id}
                        client={client}
                        pending={pendingId === client.id && isPending}
                        onToggle={() => handleToggle(client)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unassigned */}
              {unassigned.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--color-muted-foreground)' }}>
                    Sin asignar ({unassigned.length})
                  </p>
                  <div className="space-y-1.5">
                    {unassigned.map(client => (
                      <ClientRow
                        key={client.id}
                        client={client}
                        pending={pendingId === client.id && isPending}
                        onToggle={() => handleToggle(client)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs text-center" style={{ color: 'var(--color-muted-foreground)' }}>
            {assigned.length} cliente{assigned.length !== 1 ? 's' : ''} asignado{assigned.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

function ClientRow({
  client,
  pending,
  onToggle,
}: {
  client: CoachBranchClient
  pending: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors"
      style={{
        borderColor: client.assigned ? 'var(--color-coach)' : 'var(--color-border)',
        backgroundColor: client.assigned
          ? 'color-mix(in srgb, var(--color-coach) 6%, var(--color-card))'
          : 'var(--color-card)',
      }}
    >
      <Avatar name={client.full_name ?? '?'} src={client.avatar_url} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-foreground)' }}>
          {client.full_name ?? '—'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {client.client_level && (
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {LEVEL_LABELS[client.client_level] ?? client.client_level}
            </span>
          )}
          {client.hasOtherCoach && !client.assigned && (
            <span
              className="flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#d97706' }}
            >
              <AlertTriangle size={9} />
              Ya tiene coach
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onToggle}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-40"
        style={
          client.assigned
            ? { backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }
            : {
                backgroundColor: 'color-mix(in srgb, var(--color-coach) 12%, transparent)',
                color: 'var(--color-coach)',
              }
        }
      >
        {pending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : client.assigned ? (
          <>
            <Check size={12} />
            Quitar
          </>
        ) : (
          <>
            <UserPlus size={12} />
            Asignar
          </>
        )}
      </button>
    </div>
  )
}
