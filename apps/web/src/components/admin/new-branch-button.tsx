'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, AlertCircle } from 'lucide-react'
import { createBranchAction } from '@/lib/admin/actions'

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-input)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-foreground)',
}

export function NewBranchButton() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClose() {
    setOpen(false)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const name    = (fd.get('name')    as string).trim()
    const address = (fd.get('address') as string).trim() || null
    const phone   = (fd.get('phone')   as string).trim() || null
    const email   = (fd.get('email')   as string).trim() || null

    startTransition(async () => {
      const result = await createBranchAction({ name, address, phone, email })
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
        handleClose()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
        style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}
      >
        <Plus size={16} />
        Nueva sucursal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
          <div className="w-full max-w-md rounded-2xl shadow-xl flex flex-col"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
                Nueva sucursal
              </h2>
              <button type="button" onClick={handleClose}
                className="rounded-lg p-1.5 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-muted-foreground)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="px-6 py-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                    Nombre <span style={{ color: 'var(--color-admin)' }}>*</span>
                  </label>
                  <input name="name" type="text" required placeholder="Ej. Sede Central"
                    className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                    Dirección <span className="font-normal text-xs" style={{ color: 'var(--color-muted-foreground)' }}>(opcional)</span>
                  </label>
                  <input name="address" type="text" placeholder="Ej. 100m norte del parque"
                    className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Teléfono</label>
                    <input name="phone" type="tel" placeholder="+506 2222-3333"
                      className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Correo</label>
                    <input name="email" type="email" placeholder="sede@gym.com"
                      className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', color: 'var(--color-destructive)', border: '1px solid color-mix(in srgb, var(--color-destructive) 25%, transparent)' }}>
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t flex items-center justify-end gap-3 flex-shrink-0"
                style={{ borderColor: 'var(--color-border)' }}>
                <button type="button" onClick={handleClose} disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}>
                  {isPending ? 'Creando…' : 'Crear sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
