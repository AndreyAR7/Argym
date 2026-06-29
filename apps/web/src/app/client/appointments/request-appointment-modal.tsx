'use client'

import { useEffect, useRef, useState } from 'react'
import { requestAppointmentAction } from './actions'

const APPOINTMENT_TYPES = [
  { value: 'entrenamiento', label: 'Entrenamiento' },
  { value: 'evaluación',    label: 'Evaluación'    },
  { value: 'nutrición',     label: 'Nutrición'     },
  { value: 'seguimiento',   label: 'Seguimiento'   },
] as const

const DURATIONS = [
  { value: 30,  label: '30 minutos' },
  { value: 45,  label: '45 minutos' },
  { value: 60,  label: '60 minutos' },
  { value: 90,  label: '90 minutos' },
] as const

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface FormState {
  title:            string
  appointment_type: string
  preferred_date:   string
  preferred_time:   string
  duration_minutes: number
  notes:            string
}

const DEFAULT_FORM: FormState = {
  title:            '',
  appointment_type: 'entrenamiento',
  preferred_date:   todayISO(),
  preferred_time:   '08:00',
  duration_minutes: 60,
  notes:            '',
}

export function RequestAppointmentModal() {
  const [isOpen,    setIsOpen]    = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [form,      setForm]      = useState<FormState>(DEFAULT_FORM)

  const overlayRef = useRef<HTMLDivElement>(null)

  // Auto-close 2 s after success
  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => {
      setIsOpen(false)
      setSuccess(false)
      setForm(DEFAULT_FORM)
    }, 2000)
    return () => clearTimeout(timer)
  }, [success])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  function handleClose() {
    if (isPending) return
    setIsOpen(false)
    setSuccess(false)
    setError(null)
    setForm(DEFAULT_FORM)
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) handleClose()
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isPending) return

    setError(null)
    setIsPending(true)

    try {
      const result = await requestAppointmentAction({
        ...form,
        duration_minutes: Number(form.duration_minutes),
      })

      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error ?? 'Error al enviar la solicitud.')
      }
    } catch {
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-client)] text-white text-xs font-medium hover:opacity-90 active:opacity-80 transition-opacity"
      >
        <span className="text-base leading-none" aria-hidden>＋</span>
        Solicitar cita
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 p-4"
        >
          <div className="relative w-full max-w-md bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                Solicitar cita
              </h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                aria-label="Cerrar"
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-40"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="3" x2="15" y2="15"/>
                  <line x1="15" y1="3" x2="3"  y2="15"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {success ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <span className="text-3xl">✓</span>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Solicitud enviada. El coach confirmará tu cita.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Título */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      Título
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Sesión de entrenamiento"
                      value={form.title}
                      onChange={e => setField('title', e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input,var(--color-background))] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition"
                    />
                  </div>

                  {/* Tipo */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      Tipo
                    </label>
                    <select
                      value={form.appointment_type}
                      onChange={e => setField('appointment_type', e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input,var(--color-background))] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition"
                    >
                      {APPOINTMENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha + Hora en fila */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                        Fecha preferida
                      </label>
                      <input
                        type="date"
                        required
                        min={todayISO()}
                        value={form.preferred_date}
                        onChange={e => setField('preferred_date', e.target.value)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input,var(--color-background))] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                        Hora preferida
                      </label>
                      <input
                        type="time"
                        required
                        value={form.preferred_time}
                        onChange={e => setField('preferred_time', e.target.value)}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input,var(--color-background))] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition"
                      />
                    </div>
                  </div>

                  {/* Duración */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      Duración
                    </label>
                    <select
                      value={form.duration_minutes}
                      onChange={e => setField('duration_minutes', Number(e.target.value))}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input,var(--color-background))] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition"
                    >
                      {DURATIONS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Notas */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      Notas <span className="font-normal">(opcional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Agrega cualquier información adicional para tu coach..."
                      value={form.notes}
                      onChange={e => setField('notes', e.target.value)}
                      className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-input,var(--color-background))] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isPending}
                      className="px-4 py-2 rounded-lg text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-client)] text-white text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-60"
                    >
                      {isPending && (
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                      )}
                      {isPending ? 'Enviando…' : 'Solicitar cita'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
