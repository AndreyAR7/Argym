'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { addExerciseAction, updateExerciseAction } from '@/lib/admin/exercise-actions'

const MUSCLES = [
  'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
  'Piernas', 'Glúteos', 'Core', 'Cardio', 'General',
]

interface ExerciseFormProps {
  routineId: string
  exercise?: {
    id: string
    name: string
    muscle: string
    sets: number
    reps: number
    rest_seconds: number
    notes: string | null
    sort_order: number
  } | null
  nextSortOrder?: number
  onClose: () => void
}

export function ExerciseForm({ routineId, exercise, nextSortOrder = 999, onClose }: ExerciseFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isEdit = !!exercise

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const data = {
      name:        (fd.get('name') as string).trim(),
      muscle:      fd.get('muscle') as string,
      sets:        parseInt(fd.get('sets') as string) || 3,
      reps:        parseInt(fd.get('reps') as string) || 10,
      rest_seconds: parseInt(fd.get('rest_seconds') as string) || 60,
      notes:       (fd.get('notes') as string).trim() || null,
      sort_order:  exercise?.sort_order ?? nextSortOrder,
    }

    setError(null)
    startTransition(async () => {
      const result = isEdit
        ? await updateExerciseAction(exercise!.id, routineId, data)
        : await addExerciseAction(routineId, data)

      if (!result.success) {
        setError(result.error ?? 'Error al guardar')
        return
      }
      setSuccess(true)
      setTimeout(onClose, 600)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="w-full max-w-md bg-[var(--color-card)] shadow-xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            {isEdit ? 'Editar ejercicio' : 'Agregar ejercicio'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
              Nombre del ejercicio <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={exercise?.name}
              placeholder="ej. Press de banca"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20"
            />
          </div>

          {/* Muscle */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
              Grupo muscular <span className="text-red-500">*</span>
            </label>
            <select
              name="muscle"
              required
              defaultValue={exercise?.muscle ?? 'General'}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 cursor-pointer"
            >
              {MUSCLES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Sets / Reps / Rest */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
                Series
              </label>
              <input
                name="sets"
                type="number"
                min="1"
                defaultValue={exercise?.sets ?? 3}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
                Reps
              </label>
              <input
                name="reps"
                type="number"
                min="1"
                defaultValue={exercise?.reps ?? 10}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
                Descanso (s)
              </label>
              <input
                name="rest_seconds"
                type="number"
                min="0"
                defaultValue={exercise?.rest_seconds ?? 60}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
              Notas <span className="text-[var(--color-muted-foreground)] font-normal">(opcional)</span>
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={exercise?.notes ?? ''}
              placeholder="Técnica, indicaciones especiales..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Guardado correctamente
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || success}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Guardando…' : isEdit ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
