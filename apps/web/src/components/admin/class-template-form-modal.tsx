'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createClassTemplateAction, updateClassTemplateAction } from '@/lib/admin/class-template-actions'

interface ClassTemplate {
  id: string
  name: string
  branch_id: string
  coach_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  max_participants: number
  grace_hours_override: number | null
}

interface Branch { id: string; name: string }
interface Coach { id: string; full_name: string }

interface ClassTemplateFormModalProps {
  template?: ClassTemplate | null
  branches: Branch[]
  coaches: Coach[]
  defaultCapacity: number
  onClose: () => void
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function ClassTemplateFormModal({
  template, branches, coaches, defaultCapacity, onClose,
}: ClassTemplateFormModalProps) {
  const [name, setName] = useState(template?.name ?? '')
  const [branchId, setBranchId] = useState(template?.branch_id ?? branches[0]?.id ?? '')
  const [coachId, setCoachId] = useState(template?.coach_id ?? '')
  const [dayOfWeek, setDayOfWeek] = useState(template?.day_of_week ?? 1)
  const [startTime, setStartTime] = useState(template?.start_time?.slice(0, 5) ?? '06:00')
  const [endTime, setEndTime] = useState(template?.end_time?.slice(0, 5) ?? '07:00')
  const [maxParticipants, setMaxParticipants] = useState(String(template?.max_participants ?? defaultCapacity))
  const [graceOverride, setGraceOverride] = useState(template?.grace_hours_override != null ? String(template.grace_hours_override) : '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!branchId) { setError('Selecciona una sucursal'); return }
    if (startTime >= endTime) { setError('La hora de fin debe ser después de la de inicio'); return }
    const capacity = parseInt(maxParticipants, 10)
    if (!Number.isInteger(capacity) || capacity <= 0) { setError('El cupo debe ser un número entero mayor a 0'); return }
    const graceValue = graceOverride.trim() === '' ? null : parseFloat(graceOverride)
    if (graceValue !== null && (!Number.isFinite(graceValue) || graceValue <= 0)) {
      setError('El período de gracia debe ser un número mayor a 0'); return
    }
    setError(null)

    startTransition(async () => {
      const data = {
        name: name.trim(),
        branch_id: branchId,
        coach_id: coachId || null,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        max_participants: capacity,
        grace_hours_override: graceValue,
      }

      const result = template
        ? await updateClassTemplateAction(template.id, data)
        : await createClassTemplateAction(data)

      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--color-card)] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              {template ? 'Editar clase' : 'Nueva clase'}
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Horario semanal recurrente con cupo limitado
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Nombre de la clase <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Ímpetu Metabolic"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Sucursal <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Coach
              <span className="text-[var(--color-muted-foreground)] font-normal ml-1">(opcional)</span>
            </label>
            <select
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer"
            >
              <option value="">Sin asignar</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Día de la semana
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer"
            >
              {DAYS.map((d, idx) => (
                <option key={idx} value={idx}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                Hora inicio
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                Hora fin
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Cupo máximo <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Período de gracia (horas)
              <span className="text-[var(--color-muted-foreground)] font-normal ml-1">(opcional)</span>
            </label>
            <input
              type="number"
              min={0.1}
              step={0.5}
              placeholder={`Usa el default del gimnasio si se deja vacío`}
              value={graceOverride}
              onChange={(e) => setGraceOverride(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
            <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1">
              Cuántas horas antes de la clase se cancelan automáticamente las reservas sin confirmar. Déjalo vacío para usar el valor general del gimnasio.
            </p>
          </div>
        </div>

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
              {isPending ? 'Guardando…' : template ? 'Guardar cambios' : 'Crear clase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
