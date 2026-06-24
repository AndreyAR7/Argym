'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createNutritionPlanAction } from '@/lib/admin/content-actions'
import { updateNutritionPlanAction } from '@/lib/admin/nutrition-actions'

interface NutritionPlan {
  id: string
  name: string
  description: string | null
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  goal: string | null
  status: string
  is_template: boolean
}

interface NutritionFormModalProps {
  plan?: NutritionPlan
  onClose: () => void
}

type Status = 'draft' | 'published' | 'archived'

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived', label: 'Archivado' },
]

function parseNullableNumber(val: string): number | null {
  const n = parseFloat(val)
  return val.trim() === '' || isNaN(n) ? null : n
}

export function NutritionFormModal({ plan, onClose }: NutritionFormModalProps) {
  const isEdit = plan !== undefined

  const [name, setName] = useState(plan?.name ?? '')
  const [goal, setGoal] = useState(plan?.goal ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [status, setStatus] = useState<Status>((plan?.status as Status) ?? 'draft')
  const [isTemplate, setIsTemplate] = useState(plan?.is_template ?? false)
  const [calories, setCalories] = useState(plan?.calories_target?.toString() ?? '')
  const [protein, setProtein] = useState(plan?.protein_g?.toString() ?? '')
  const [carbs, setCarbs] = useState(plan?.carbs_g?.toString() ?? '')
  const [fat, setFat] = useState(plan?.fat_g?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setError(null)

    startTransition(async () => {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        calories_target: parseNullableNumber(calories),
        protein_g: parseNullableNumber(protein),
        carbs_g: parseNullableNumber(carbs),
        fat_g: parseNullableNumber(fat),
        goal: goal.trim() || null,
        status,
        is_template: isTemplate,
      }

      let result: { error?: string; success?: boolean } | undefined

      if (isEdit) {
        result = await updateNutritionPlanAction(plan.id, {
          name: data.name,
          description: data.description ?? '',
          calories_target: data.calories_target,
          protein_g: data.protein_g,
          carbs_g: data.carbs_g,
          fat_g: data.fat_g,
          goal: data.goal ?? '',
          status: data.status,
          is_template: data.is_template,
        })
      } else {
        result = await createNutritionPlanAction({
          name: data.name,
          description: data.description,
          calories_target: data.calories_target,
          protein_g: data.protein_g,
          carbs_g: data.carbs_g,
          fat_g: data.fat_g,
          goal: data.goal,
        })
      }

      if (result?.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-[440px] bg-[var(--color-card)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              {isEdit ? 'Editar plan nutricional' : 'Nuevo plan nutricional'}
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              {isEdit
                ? 'Modifica los detalles del plan'
                : 'Define los macros y objetivos del plan'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Nombre <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Plan de definición muscular"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>

          {/* Goal */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Objetivo
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="ej. Pérdida de peso, Ganancia muscular"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el plan nutricional..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all resize-none"
            />
          </div>

          {/* Status — segmented control */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Estado
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    status === opt.value
                      ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)] text-[var(--color-admin)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[var(--color-ring)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Is Template */}
          <div className="flex items-center gap-3">
            <input
              id="is_template"
              type="checkbox"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-input)] accent-[var(--color-admin)] cursor-pointer"
            />
            <label
              htmlFor="is_template"
              className="text-sm text-[var(--color-foreground)] cursor-pointer select-none"
            >
              Marcar como plantilla
            </label>
          </div>

          {/* Macros section */}
          <div>
            <p className="text-xs font-semibold text-[var(--color-foreground)] uppercase tracking-wide mb-3">
              Macros
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Calories */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                  Calorías objetivo
                </label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  min="0"
                  step="1"
                  placeholder="—"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
                />
              </div>

              {/* Protein */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                  Proteínas (g)
                </label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  min="0"
                  step="0.1"
                  placeholder="—"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
                />
              </div>

              {/* Carbs */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                  Carbohidratos (g)
                </label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  min="0"
                  step="0.1"
                  placeholder="—"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
                />
              </div>

              {/* Fat */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                  Grasas (g)
                </label>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  min="0"
                  step="0.1"
                  placeholder="—"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] space-y-3">
          {error && (
            <p className="text-xs text-[var(--color-destructive)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
