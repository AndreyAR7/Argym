'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, PowerOff, Power, X, AlertCircle } from 'lucide-react'
import { toggleBranchActiveAction, updateBranchAction } from '@/lib/admin/actions'

interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-input)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-foreground)',
}

export function BranchActions({ branch }: { branch: Branch }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen(v => !v)
  }

  function handleToggleActive() {
    setOpen(false)
    startTransition(async () => {
      await toggleBranchActiveAction(branch.id, !branch.is_active)
      router.refresh()
    })
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data = {
      name:    (fd.get('name')    as string).trim(),
      address: (fd.get('address') as string).trim() || null,
      phone:   (fd.get('phone')   as string).trim() || null,
      email:   (fd.get('email')   as string).trim() || null,
    }
    startTransition(async () => {
      const result = await updateBranchAction(branch.id, data)
      if (result?.error) { setError(result.error); return }
      router.refresh()
      setShowEdit(false)
    })
  }

  return (
    <>
      <div className="relative inline-block">
        <button ref={btnRef} onClick={handleOpen} disabled={isPending}
          className="w-8 h-8 inline-flex items-center justify-center rounded-md transition-colors hover:bg-[var(--color-muted)]"
          style={{ color: 'var(--color-muted-foreground)' }}>
          <MoreHorizontal size={15} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="fixed z-50 w-44 rounded-lg border shadow-lg py-1 text-sm"
              style={{ top: pos.top, right: pos.right, backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <button onClick={() => { setOpen(false); setShowEdit(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--color-muted)]"
                style={{ color: 'var(--color-foreground)' }}>
                <Pencil size={13} style={{ color: 'var(--color-muted-foreground)' }} />
                Editar
              </button>
              <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
              <button onClick={handleToggleActive} disabled={isPending}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--color-muted)] disabled:opacity-50"
                style={{ color: branch.is_active ? 'var(--color-destructive)' : 'var(--color-coach)' }}>
                {branch.is_active ? <PowerOff size={13} /> : <Power size={13} />}
                {branch.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </>
        )}
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setShowEdit(false) }}>
          <div className="w-full max-w-md rounded-2xl shadow-xl flex flex-col"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Editar sucursal</h2>
              <button type="button" onClick={() => setShowEdit(false)}
                className="rounded-lg p-1.5 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-muted-foreground)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col">
              <div className="px-6 py-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                    Nombre <span style={{ color: 'var(--color-admin)' }}>*</span>
                  </label>
                  <input name="name" type="text" required defaultValue={branch.name}
                    className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                    Dirección
                  </label>
                  <input name="address" type="text" defaultValue={branch.address ?? ''}
                    className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Teléfono</label>
                    <input name="phone" type="tel" defaultValue={branch.phone ?? ''}
                      className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Correo</label>
                    <input name="email" type="email" defaultValue={branch.email ?? ''}
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
                <button type="button" onClick={() => setShowEdit(false)} disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}>
                  {isPending ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
