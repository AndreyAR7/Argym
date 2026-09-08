'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createScheduleBlockAction } from '@/lib/admin/schedule-block-actions'

interface Branch { id: string; name: string }
interface Coach { id: string; full_name: string }

interface ScheduleBlockModalProps {
  branches: Branch[]
  coaches: Coach[]
  initialDate?: string
  onClose: () => void
}

export function ScheduleBlockModal({ branches, coaches, initialDate, onClose }: ScheduleBlockModalProps) {
  const [scope, setScope] = useState<'branch' | 'coach'>('coach')
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [coachId, setCoachId] = useState(coaches[0]?.id ?? '')
  const [date, setDate] = useState(initialDate ?? new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('06:00')
  const [endTime, setEndTime] = useState('22:00')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (scope === 'branch' && !branchId) { setError('Selecciona una sucursal'); return }
    if (scope === 'coach' && !coachId) { setError('Selecciona un coach'); return }
    if (startTime >= endTime) { setError('La hora de fin debe ser después de la de inicio'); return }
    setError(null)

    startTransition(async () => {
      const result = await createScheduleBlockAction({
        branch_id: scope === 'branch' ? branchId : null,
        coach_id: scope === 'coach' ? coachId : null,
        start_time: new Date(`${date}T${startTime}:00`).toISOString(),
        end_time: new Date(`${date}T${endTime}:00`).toISOString(),
        reason: reason.trim() || null,
      })
      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">Bloquear horario</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Bloquear</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope('coach')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                  scope === 'coach'
                    ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)] text-[var(--color-admin)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted-foreground)]'
                }`}
              >
                Un coach
              </button>
              <button
                type="button"
                onClick={() => setScope('branch')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                  scope === 'branch'
                    ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)] text-[var(--color-admin)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted-foreground)]'
                }`}
              >
                Toda la sucursal
              </button>
            </div>
          </div>

          {scope === 'coach' ? (
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Coach</label>
              <select
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer"
              >
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Sucursal</label>
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
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Desde</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Hasta</label>
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
              Motivo <span className="text-[var(--color-muted-foreground)] font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Vacaciones, mantenimiento"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--color-destructive)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
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
              {isPending ? 'Bloqueando…' : 'Bloquear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
