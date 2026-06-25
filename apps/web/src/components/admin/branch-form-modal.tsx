'use client'

import { useState, useTransition } from 'react'
import { createBranchAction, updateBranchAction } from '@/lib/admin/branch-actions'
import { X } from 'lucide-react'

interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

interface Props {
  branch?: Branch
  onClose: () => void
}

export function BranchFormModal({ branch, onClose }: Props) {
  const isEditing = !!branch
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(branch?.is_active ?? true)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const data = new FormData(form)

    const payload = {
      name: data.get('name') as string,
      address: (data.get('address') as string) || null,
      phone: (data.get('phone') as string) || null,
      email: (data.get('email') as string) || null,
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateBranchAction(branch.id, { ...payload, is_active: isActive })
        : await createBranchAction(payload)

      if (result?.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-xl mx-4"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {isEditing ? 'Editar sucursal' : 'Nueva sucursal'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:opacity-70 transition-colors" style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Nombre <span style={{ color: 'var(--color-admin)' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={branch?.name ?? ''}
              placeholder="Ej. Sede Central"
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{ backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Dirección
            </label>
            <input
              type="text"
              name="address"
              defaultValue={branch?.address ?? ''}
              placeholder="Ej. Av. Central 123, San José"
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{ backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Teléfono</label>
              <input
                type="tel"
                name="phone"
                defaultValue={branch?.phone ?? ''}
                placeholder="2222-3333"
                className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{ backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Correo</label>
              <input
                type="email"
                name="email"
                defaultValue={branch?.email ?? ''}
                placeholder="sede@gimnasio.com"
                className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{ backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>
          </div>

          {/* is_active toggle — edit only */}
          {isEditing && (
            <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: 'var(--color-muted)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Sucursal activa</span>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className="relative inline-flex h-6 w-11 rounded-full transition-colors"
                style={{ backgroundColor: isActive ? 'var(--color-admin)' : 'var(--color-border)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: isActive ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-admin) 10%, transparent)',
                color: 'var(--color-admin)',
                border: '1px solid color-mix(in srgb, var(--color-admin) 30%, transparent)',
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}
            >
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear sucursal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
