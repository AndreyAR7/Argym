'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createRoutineAction } from '@/lib/admin/exercise-actions'

interface Props {
  onClose: () => void
}

type Level = 'beginner' | 'intermediate' | 'advanced'

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
]

const PLAN_OPTIONS = [
  { value: 'basic', label: 'Básico' },
  { value: 'medium', label: 'Medio' },
  { value: 'premium', label: 'Premium' },
]

export function RoutineFormModal({ onClose }: Props) {
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<Level>('beginner')
  const [isActive, setIsActive] = useState(true)
  const [isTemplate, setIsTemplate] = useState(false)
  const [allowedPlans, setAllowedPlans] = useState<string[]>([])
  const [allowedLevels, setAllowedLevels] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function togglePlan(value: string) {
    setAllowedPlans((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    )
  }

  function toggleAllowedLevel(value: string) {
    setAllowedLevels((prev) =>
      prev.includes(value) ? prev.filter((l) => l !== value) : [...prev, value]
    )
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createRoutineAction({
        name: name.trim(),
        description: description.trim() || null,
        level,
        is_active: isActive,
        is_template: isTemplate,
        allowed_plans: allowedPlans,
        allowed_levels: allowedLevels,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => onClose(), 700)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className="relative w-[440px] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--color-foreground)' }}
            >
              Nueva rutina
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Define los detalles y configuracion de acceso
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--color-muted-foreground)' }}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Nombre */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-foreground)' }}
            >
              Nombre <span style={{ color: 'var(--color-admin)' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Rutina de fuerza 3 dias"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all"
              style={{
                border: '1px solid var(--color-input)',
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-foreground)',
              }}
            />
          </div>

          {/* Descripcion */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-foreground)' }}
            >
              Descripcion
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente la rutina..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all resize-none"
              style={{
                border: '1px solid var(--color-input)',
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-foreground)',
              }}
            />
          </div>

          {/* Nivel — segmented buttons */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--color-foreground)' }}
            >
              Nivel
            </label>
            <div className="flex gap-2">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLevel(opt.value)}
                  className="flex-1 py-2 text-xs font-medium rounded-lg border transition-all"
                  style={
                    level === opt.value
                      ? {
                          borderColor: 'var(--color-admin)',
                          backgroundColor: 'var(--color-admin-light)',
                          color: 'var(--color-admin)',
                        }
                      : {
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-muted-foreground)',
                        }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Separador de opciones de visibilidad */}
          <div
            className="border-t pt-1"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--color-foreground)' }}
            >
              Configuracion
            </p>
          </div>

          {/* Estado activo */}
          <div className="flex items-center gap-3">
            <input
              id="is_active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: 'var(--color-admin)', borderColor: 'var(--color-input)' }}
            />
            <label
              htmlFor="is_active"
              className="text-sm cursor-pointer select-none"
              style={{ color: 'var(--color-foreground)' }}
            >
              Rutina activa
            </label>
          </div>

          {/* Plantilla */}
          <div className="flex items-center gap-3">
            <input
              id="is_template"
              type="checkbox"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: 'var(--color-admin)', borderColor: 'var(--color-input)' }}
            />
            <label
              htmlFor="is_template"
              className="text-sm cursor-pointer select-none"
              style={{ color: 'var(--color-foreground)' }}
            >
              Marcar como plantilla
            </label>
          </div>

          {/* Planes permitidos */}
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--color-foreground)' }}
            >
              Planes permitidos
            </label>
            <div className="flex gap-4">
              {PLAN_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer select-none"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  <input
                    type="checkbox"
                    checked={allowedPlans.includes(opt.value)}
                    onChange={() => togglePlan(opt.value)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: 'var(--color-admin)', borderColor: 'var(--color-input)' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Niveles permitidos */}
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: 'var(--color-foreground)' }}
            >
              Niveles permitidos
            </label>
            <div className="flex gap-4">
              {LEVEL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm cursor-pointer select-none"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  <input
                    type="checkbox"
                    checked={allowedLevels.includes(opt.value)}
                    onChange={() => toggleAllowedLevel(opt.value)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: 'var(--color-admin)', borderColor: 'var(--color-input)' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t space-y-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {error && (
            <p
              className="text-xs rounded-lg px-3 py-2 border"
              style={{
                color: 'var(--color-admin)',
                backgroundColor: 'var(--color-admin-light)',
                borderColor: 'var(--color-admin)',
              }}
            >
              {error}
            </p>
          )}

          {success && (
            <p
              className="text-xs rounded-lg px-3 py-2 border"
              style={{
                color: 'var(--color-admin)',
                backgroundColor: 'var(--color-admin-light)',
                borderColor: 'var(--color-admin)',
              }}
            >
              Rutina creada
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending || success}
              className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-muted-foreground)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || success}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-admin)',
                color: 'var(--color-primary-foreground)',
              }}
            >
              {isPending ? 'Guardando...' : 'Crear rutina'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
