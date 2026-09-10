'use client'

import { useState, useTransition } from 'react'
import { Mail, User, X, CheckCircle2, AlertCircle, UserPlus2 } from 'lucide-react'
import { sendClientInvitationAction } from '@/lib/admin/client-invitation-actions'

export function InviteClientButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-muted)]"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
      >
        <UserPlus2 size={14} />
        Enviar invitación
      </button>

      {open && <InviteClientModal onClose={() => setOpen(false)} />}
    </>
  )
}

function InviteClientModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const full_name = fd.get('full_name') as string

    startTransition(async () => {
      const res = await sendClientInvitationAction({ email, full_name })
      if (res.error) setError(res.error)
      else setSuccess(true)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-xl p-6"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Invitar cliente
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-client) 12%, transparent)' }}
            >
              <CheckCircle2 size={28} style={{ color: 'var(--color-client)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Invitación enviada
            </p>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Cuando esa persona cree su cuenta con ese correo, quedará activa de inmediato — sin aprobación manual.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
              Le enviamos un correo con el link para unirse. Si acepta con ese mismo correo (Google o contraseña), entra directo como cliente activo.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Nombre completo
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
                  <input
                    name="full_name"
                    type="text"
                    required
                    placeholder="Ej. María Rodríguez"
                    autoComplete="name"
                    className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none transition-colors"
                    style={{ backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="cliente@ejemplo.com"
                    autoComplete="email"
                    className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none transition-colors"
                    style={{ backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
                  />
                </div>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-destructive) 25%, transparent)',
                    color: 'var(--color-destructive)',
                  }}
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                >
                  {isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    'Enviar invitación'
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
