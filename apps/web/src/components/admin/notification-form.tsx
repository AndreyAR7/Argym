'use client'

import { useState, useTransition } from 'react'
import { Send, CheckCircle, Bell, Users, Dumbbell } from 'lucide-react'
import { sendPushNotificationAction } from '@/lib/admin/settings-actions'

type Target = 'all' | 'client' | 'coach'

const TARGETS: { value: Target; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'all',
    label: 'Todos',
    description: 'Clientes y coaches',
    icon: <Bell size={16} />,
  },
  {
    value: 'client',
    label: 'Clientes',
    description: 'Solo usuarios con rol cliente',
    icon: <Users size={16} />,
  },
  {
    value: 'coach',
    label: 'Coaches',
    description: 'Solo usuarios con rol coach',
    icon: <Dumbbell size={16} />,
  },
]

export function NotificationForm() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<Target>('all')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!title.trim()) { setError('El título es obligatorio'); return }
    if (!body.trim()) { setError('El mensaje es obligatorio'); return }
    setError(null)
    setSent(false)

    startTransition(async () => {
      const result = await sendPushNotificationAction({ title: title.trim(), body: body.trim(), target_role: target })
      if (result?.error) setError(result.error)
      else {
        setSent(true)
        setTitle('')
        setBody('')
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Compose */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Redactar notificación</h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            La notificación se enviará a los dispositivos móviles registrados.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Título <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={65}
              placeholder="Ej. ¡Nuevas clases disponibles!"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
            <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1 text-right">
              {title.length}/65
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Mensaje <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={240}
              rows={3}
              placeholder="Escribe el cuerpo de la notificación..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all resize-none"
            />
            <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1 text-right">
              {body.length}/240
            </p>
          </div>
        </div>
      </section>

      {/* Target */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Destinatarios</h3>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3">
          {TARGETS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTarget(t.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                target === t.value
                  ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-ring)] hover:bg-[var(--color-muted)]'
              }`}
            >
              <span style={{ color: target === t.value ? 'var(--color-admin)' : 'var(--color-muted-foreground)' }}>
                {t.icon}
              </span>
              <div>
                <p className={`text-sm font-medium ${target === t.value ? 'text-[var(--color-admin)]' : 'text-[var(--color-foreground)]'}`}>
                  {t.label}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Preview */}
      {(title || body) && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Vista previa</h3>
          </div>
          <div className="p-6">
            <div className="rounded-2xl bg-zinc-900 text-white p-4 max-w-xs shadow-xl">
              <div className="flex items-center gap-2 mb-2 opacity-60">
                <div className="w-5 h-5 rounded-md bg-[var(--color-admin)] flex items-center justify-center">
                  <span className="text-[8px] font-bold">A</span>
                </div>
                <span className="text-xs font-medium">ARGYM</span>
                <span className="text-xs ml-auto">ahora</span>
              </div>
              <p className="font-semibold text-sm">{title || 'Título de la notificación'}</p>
              <p className="text-xs mt-1 opacity-80 line-clamp-2">{body || 'Cuerpo del mensaje...'}</p>
            </div>
          </div>
        </section>
      )}

      {/* Feedback */}
      {error && (
        <p className="text-xs text-[var(--color-destructive)] bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}
      {sent && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          <CheckCircle size={15} />
          Notificación enviada correctamente
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={isPending || !title.trim() || !body.trim()}
        className="flex items-center gap-2 rounded-lg bg-[var(--color-admin)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={14} />
        {isPending ? 'Enviando…' : 'Enviar notificación'}
      </button>
    </div>
  )
}
