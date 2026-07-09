'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, X, Zap } from 'lucide-react'
import { createAdminChallengeAction } from './actions'

type ChallengeType = 'global' | '1v1' | 'group'
type ExpiresIn = '1w' | '2w' | '1m' | null

const CHALLENGE_TYPES: { value: ChallengeType; label: string; desc: string }[] = [
  { value: 'global',  label: 'Global',  desc: 'Todos los miembros participan' },
  { value: 'group',   label: 'Grupo',   desc: 'Un grupo seleccionado' },
  { value: '1v1',     label: '1 vs 1',  desc: 'Duelo entre dos miembros' },
]

const EXPIRES_OPTIONS: { value: ExpiresIn; label: string }[] = [
  { value: null,  label: 'Sin límite' },
  { value: '1w',  label: '1 semana' },
  { value: '2w',  label: '2 semanas' },
  { value: '1m',  label: '1 mes' },
]

export function CreateChallengeButton() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [challengeType, setChallengeType] = useState<ChallengeType>('global')
  const [xpReward, setXpReward]         = useState(100)
  const [expiresIn, setExpiresIn]       = useState<ExpiresIn>('1w')

  const backdropRef = useRef<HTMLDivElement>(null)

  function reset() {
    setTitle('')
    setDescription('')
    setChallengeType('global')
    setXpReward(100)
    setExpiresIn('1w')
    setError(null)
    setSuccess(false)
  }

  function handleOpen() { reset(); setOpen(true) }
  function handleClose() { setOpen(false) }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === backdropRef.current) handleClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('El título es obligatorio'); return }
    if (xpReward < 1) { setError('La recompensa debe ser al menos 1 XP'); return }

    setError(null)
    startTransition(async () => {
      const result = await createAdminChallengeAction({
        title, description, challengeType, xpReward, expiresIn,
      })
      if (result.success) {
        setSuccess(true)
        setTimeout(() => { handleClose() }, 1200)
      } else {
        setError(result.error ?? 'Error al crear el reto')
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-admin)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
      >
        <Plus size={15} />
        Crear reto
      </button>

      {open && (
        <div
          ref={backdropRef}
          onClick={handleBackdrop}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-[var(--color-foreground)]">Nuevo reto</h2>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Visible para todos los miembros activos</p>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-3 py-12 px-5 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-2xl">
                  ⚔️
                </div>
                <p className="text-base font-bold text-[var(--color-foreground)]">¡Reto creado!</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">Los miembros ya pueden verlo</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1.5">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ej: 10 check-ins en noviembre"
                    maxLength={120}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-admin)]/40"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1.5">
                    Descripción
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Explica las reglas del reto..."
                    rows={2}
                    maxLength={400}
                    className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-admin)]/40"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1.5">
                    Tipo
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CHALLENGE_TYPES.map(ct => (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => setChallengeType(ct.value)}
                        className={[
                          'rounded-lg border px-3 py-2 text-left transition-all',
                          challengeType === ct.value
                            ? 'border-[var(--color-admin)] bg-[var(--color-admin)]/5 ring-1 ring-[var(--color-admin)]/30'
                            : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
                        ].join(' ')}
                      >
                        <p className="text-xs font-semibold text-[var(--color-foreground)]">{ct.label}</p>
                        <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5 leading-tight">{ct.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* XP + Expires row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1.5">
                      <span className="inline-flex items-center gap-1"><Zap size={11} className="text-amber-500" />Recompensa XP</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={xpReward}
                      onChange={e => setXpReward(Number(e.target.value))}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-semibold text-amber-600 tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-admin)]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-foreground)] mb-1.5">
                      Duración
                    </label>
                    <select
                      value={expiresIn ?? ''}
                      onChange={e => setExpiresIn((e.target.value as ExpiresIn) || null)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-admin)]/40"
                    >
                      {EXPIRES_OPTIONS.map(opt => (
                        <option key={opt.value ?? 'null'} value={opt.value ?? ''}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-admin)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                  >
                    {isPending ? 'Creando…' : 'Crear reto'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
