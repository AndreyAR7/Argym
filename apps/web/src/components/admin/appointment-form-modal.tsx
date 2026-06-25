'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAppointmentAction } from '@/lib/admin/appointment-actions'

interface Props {
  coaches: Array<{ id: string; full_name: string }>
  clients: Array<{ id: string; full_name: string }>
  onClose: () => void
}

export default function AppointmentFormModal({ coaches, clients, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [appointmentType, setAppointmentType] = useState<'in_person' | 'virtual'>('in_person')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const data = new FormData(form)

    const title = (data.get('title') as string).trim()
    const client_id = data.get('client_id') as string
    const coach_id = (data.get('coach_id') as string) || null
    const date = data.get('date') as string
    const startTime = data.get('start_time') as string
    const endTime = data.get('end_time') as string
    const notes = ((data.get('notes') as string) || '').trim() || null
    const location = appointmentType === 'in_person' ? ((data.get('location') as string) || null) : null
    const meeting_url = appointmentType === 'virtual' ? ((data.get('meeting_url') as string) || null) : null

    if (!date || !startTime || !endTime) {
      setError('Completa la fecha y hora de la cita.')
      return
    }

    const startDate = new Date(`${date}T${startTime}`)
    const endDate = new Date(`${date}T${endTime}`)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError('Fecha u hora inválida.')
      return
    }

    startTransition(async () => {
      try {
        const result = await createAppointmentAction({
          title,
          client_id,
          coach_id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          appointment_type: appointmentType,
          location,
          meeting_url,
          description: notes,
        })

        if (result?.error) {
          setError(result.error)
        } else {
          router.refresh()
          onClose()
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error inesperado. Inténtalo de nuevo.')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-xl mx-4"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Nueva cita
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:opacity-70"
            style={{ color: 'var(--color-muted-foreground)' }}
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Título de la cita <span style={{ color: 'var(--color-admin)' }}>*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="Ej. Sesión de evaluación inicial"
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-input)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
            />
          </div>

          {/* Client */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Cliente <span style={{ color: 'var(--color-admin)' }}>*</span>
            </label>
            <select
              name="client_id"
              required
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-input)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
              defaultValue=""
            >
              <option value="" disabled>Seleccionar cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>

          {/* Coach */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Coach
            </label>
            <select
              name="coach_id"
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-input)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
              defaultValue=""
            >
              <option value="">Sin asignar</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>

          {/* Appointment type */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Tipo de cita
            </label>
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <button
                type="button"
                onClick={() => setAppointmentType('in_person')}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={
                  appointmentType === 'in_person'
                    ? { backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }
                    : { backgroundColor: 'var(--color-input)', color: 'var(--color-muted-foreground)' }
                }
              >
                Presencial
              </button>
              <button
                type="button"
                onClick={() => setAppointmentType('virtual')}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={
                  appointmentType === 'virtual'
                    ? { backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }
                    : { backgroundColor: 'var(--color-input)', color: 'var(--color-muted-foreground)' }
                }
              >
                Virtual
              </button>
            </div>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Fecha <span style={{ color: 'var(--color-admin)' }}>*</span>
            </label>
            <input
              type="date"
              name="date"
              required
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-input)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
            />
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Hora inicio <span style={{ color: 'var(--color-admin)' }}>*</span>
              </label>
              <input
                type="time"
                name="start_time"
                required
                className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--color-input)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Hora fin <span style={{ color: 'var(--color-admin)' }}>*</span>
              </label>
              <input
                type="time"
                name="end_time"
                required
                className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--color-input)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              />
            </div>
          </div>

          {/* Location — only for in_person */}
          {appointmentType === 'in_person' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Ubicación
              </label>
              <input
                type="text"
                name="location"
                placeholder="Ej. Sala de pesas, planta baja"
                className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--color-input)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              />
            </div>
          )}

          {/* Meeting URL — only for virtual */}
          {appointmentType === 'virtual' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Enlace de reunión
              </label>
              <input
                type="url"
                name="meeting_url"
                placeholder="https://meet.google.com/..."
                className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--color-input)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              />
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              Notas
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Observaciones adicionales..."
              className="rounded-lg px-3 py-2 text-sm outline-none transition-colors resize-none"
              style={{
                backgroundColor: 'var(--color-input)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-admin) 10%, transparent)',
                color: 'var(--color-admin)',
                border: '1px solid color-mix(in srgb, var(--color-admin) 30%, transparent)',
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div
            className="flex items-center justify-end gap-3 pt-2 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-muted)',
                color: 'var(--color-foreground)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-admin)',
                color: 'var(--color-primary-foreground)',
              }}
            >
              {isPending ? 'Guardando...' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
