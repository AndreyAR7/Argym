'use client'

import { useState, useRef } from 'react'
import { ChevronDown, ChevronUp, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { recordMeasurementAction } from './actions'

interface Props {
  clientId: string
}

const FIELDS = [
  [
    { name: 'weight_kg',    label: 'Peso (kg)' },
    { name: 'height_cm',   label: 'Talla (cm)' },
    { name: 'body_fat_pct', label: '% Grasa corporal' },
  ],
  [
    { name: 'neck_cm',     label: 'Cuello (cm)' },
    { name: 'shoulder_cm', label: 'Hombro (cm)' },
    { name: 'chest_cm',    label: 'Pecho (cm)' },
  ],
  [
    { name: 'waist_cm',    label: 'Cintura (cm)' },
    { name: 'abdomen_cm',  label: 'Abdomen (cm)' },
    { name: 'hip_cm',      label: 'Cadera (cm)' },
  ],
  [
    { name: 'arm_cm',      label: 'Brazo (cm)' },
    { name: 'thigh_cm',    label: 'Muslo (cm)' },
    { name: 'calf_cm',     label: 'Pantorrilla (cm)' },
  ],
] as const

type FieldName = typeof FIELDS[number][number]['name']

export function RecordMeasurementButton({ clientId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    const fd = new FormData(e.currentTarget)

    function parseField(name: string): number | null {
      const raw = fd.get(name)
      if (!raw || String(raw).trim() === '') return null
      const n = parseFloat(String(raw))
      return isNaN(n) ? null : n
    }

    const data = {
      weight_kg:    parseField('weight_kg'),
      height_cm:    parseField('height_cm'),
      body_fat_pct: parseField('body_fat_pct'),
      neck_cm:      parseField('neck_cm'),
      shoulder_cm:  parseField('shoulder_cm'),
      chest_cm:     parseField('chest_cm'),
      waist_cm:     parseField('waist_cm'),
      abdomen_cm:   parseField('abdomen_cm'),
      hip_cm:       parseField('hip_cm'),
      arm_cm:       parseField('arm_cm'),
      thigh_cm:     parseField('thigh_cm'),
      calf_cm:      parseField('calf_cm'),
      notes:        (fd.get('notes') as string | null) || null,
    }

    const result = await recordMeasurementAction(clientId, data)
    setLoading(false)

    if (result.success) {
      setStatus({ type: 'success', message: 'Medición guardada exitosamente.' })
      formRef.current?.reset()
      setTimeout(() => {
        setOpen(false)
        setStatus(null)
      }, 2000)
    } else {
      setStatus({ type: 'error', message: result.error ?? 'Error al guardar la medición.' })
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setStatus(null) }}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-card)] hover:bg-[var(--color-muted)] transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
          <Plus size={15} className="text-[var(--color-muted-foreground)]" />
          Registrar medición
        </span>
        {open
          ? <ChevronUp size={16} className="text-[var(--color-muted-foreground)]" />
          : <ChevronDown size={16} className="text-[var(--color-muted-foreground)]" />
        }
      </button>

      {/* Collapsible form */}
      {open && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="border-t border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-4"
        >
          {FIELDS.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {row.map(({ name, label }) => (
                <div key={name} className="flex flex-col gap-1">
                  <label
                    htmlFor={`mf-${name}`}
                    className="text-xs font-medium text-[var(--color-muted-foreground)]"
                  >
                    {label}
                  </label>
                  <input
                    id={`mf-${name}`}
                    name={name}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="—"
                    className="px-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)] tabular-nums"
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label htmlFor="mf-notes" className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Notas
            </label>
            <textarea
              id="mf-notes"
              name="notes"
              rows={2}
              placeholder="Observaciones adicionales..."
              className="px-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)] resize-none"
            />
          </div>

          {/* Status feedback */}
          {status && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
              status.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
            }`}>
              {status.type === 'success'
                ? <CheckCircle2 size={14} className="flex-shrink-0" />
                : <AlertCircle size={14} className="flex-shrink-0" />
              }
              {status.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar medición'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setStatus(null) }}
              className="px-4 py-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
