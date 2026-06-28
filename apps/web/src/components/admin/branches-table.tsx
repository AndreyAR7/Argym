'use client'

import { useState, useTransition } from 'react'
import { Building2, Plus, Pencil, Trash2, MapPin, Phone, Mail, CheckCircle, XCircle } from 'lucide-react'
import { BranchFormModal } from './branch-form-modal'
import { deleteBranchAction } from '@/lib/admin/branch-actions'
import { useConfirm } from '@/context/confirm-context'
import { useToast } from '@/context/toast-context'

interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  client_count: number
}

interface Props {
  branches: Branch[]
}

export function BranchesTable({ branches }: Props) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { confirm } = useConfirm()
  const { showToast } = useToast()

  function handleDelete(branch: Branch) {
    startTransition(async () => {
      const ok = await confirm({
        title: 'Eliminar sucursal',
        message: `¿Eliminar "${branch.name}"? Los clientes asignados quedarán sin sucursal.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      setDeletingId(branch.id)
      const result = await deleteBranchAction(branch.id)
      setDeletingId(null)
      if (result?.error) {
        showToast('error', result.error)
      } else {
        showToast('success', `Sucursal "${branch.name}" eliminada`)
      }
    })
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {branches.length} sucursal{branches.length !== 1 ? 'es' : ''}
        </p>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}
        >
          <Plus size={16} />
          Nueva sucursal
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-muted)' }}>
            <Building2 size={24} style={{ color: 'var(--color-border)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>No hay sucursales</p>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Crea la primera sucursal para organizar tus clientes por sede.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="mt-2 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}
          >
            <Plus size={14} />
            Crear primera sucursal
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-xl border p-5 flex flex-col gap-3 transition-shadow hover:shadow-md"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', opacity: branch.is_active ? 1 : 0.6 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--color-admin) 12%, transparent)' }}>
                    <Building2 size={18} style={{ color: 'var(--color-admin)' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-foreground)' }}>{branch.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {branch.is_active
                        ? <CheckCircle size={12} className="text-green-500" />
                        : <XCircle size={12} className="text-gray-400" />
                      }
                      <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                        {branch.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Client count badge */}
                <span
                  className="flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-admin) 10%, transparent)', color: 'var(--color-admin)' }}
                >
                  {branch.client_count} cliente{branch.client_count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-1.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {branch.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="flex-shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} className="flex-shrink-0" />
                    <span className="truncate">{branch.email}</span>
                  </div>
                )}
                {!branch.address && !branch.phone && !branch.email && (
                  <span className="italic">Sin información de contacto</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => setEditing(branch)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
                >
                  <Pencil size={12} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(branch)}
                  disabled={isPending && deletingId === branch.id}
                  className="flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)', color: 'var(--color-destructive)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {creating && <BranchFormModal onClose={() => setCreating(false)} />}
      {editing && <BranchFormModal branch={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
