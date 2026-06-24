'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, MapPin, Video, Phone, User } from 'lucide-react'
import { createAppointmentAction } from '@/lib/admin/appointment-actions'

interface Coach {
  id: string
  full_name: string
}

interface Client {
  id: string
  full_name: string
  client_level: string | null
}

interface Props {
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  coaches: Coach[]
  clients: Client[]
  onClose: () => void
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
]

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const totalMin = h * 60 + m + 60
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

export function AppointmentQuickForm({ date, startTime, coaches, clients, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [appointmentType, setAppointmentType] = useState<'in_person' | 'virtual' | 'phone'>('in_person')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [endTime, setEndTime] = useState(addHour(startTime))

  const filteredClients = levelFilter === 'all'
    ? clients
    : clients.filter((c) => (c.client_level ?? '').toLowerCase() === levelFilter)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)

    const title = fd.get('title') as string
    const client_id = fd.get('client_id') as string
    const coach_id = (fd.get('coach_id') as string) || null
    const notes = ((fd.get('notes') as string) || '').trim() || null
    const location = appointmentType === 'in_person' ? ((fd.get('location') as string) || null) : null
    const meeting_url = appointmentType === 'virtual' ? ((fd.get('meeting_url') as string) || null) : null

    const start_time = new Date(`${date}T${startTime}`).toISOString()
    const end_time = new Date(`${date}T${endTime}`).toISOString()

    startTransition(async () => {
      const result = await createAppointmentAction({
        title,
        client_id,
        coach_id,
        start_time,
        end_time,
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
    })
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--color-card)', borderLeft: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Nueva cita
            </h2>
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-muted-foreground)' }}>
              <Clock size={11} />
              {date} · {startTime} – {endTime}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable form body + footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Título <span style={{ color: 'var(--color-admin)' }}>*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ej. Sesión de evaluación inicial"
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>

            {/* Level filter + Client selector */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Cliente <span style={{ color: 'var(--color-admin)' }}>*</span>
              </label>
              <div className="flex gap-1 flex-wrap mb-1">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLevelFilter(opt.value)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    style={
                      levelFilter === opt.value
                        ? { backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }
                        : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <select
                name="client_id"
                required
                defaultValue=""
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="" disabled>Seleccionar cliente</option>
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                    {c.client_level ? ` · ${LEVEL_LABELS[c.client_level.toLowerCase()] ?? c.client_level}` : ''}
                  </option>
                ))}
              </select>
              {filteredClients.length === 0 && levelFilter !== 'all' && (
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  No hay clientes con este nivel.
                </p>
              )}
            </div>

            {/* Coach */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-foreground)' }}>
                <User size={13} />
                Coach
              </label>
              <select
                name="coach_id"
                defaultValue=""
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
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
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                {(
                  [
                    { value: 'in_person', label: 'Presencial', Icon: MapPin },
                    { value: 'virtual',   label: 'Virtual',    Icon: Video  },
                    { value: 'phone',     label: 'Teléfono',   Icon: Phone  },
                  ] as const
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAppointmentType(value)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors"
                    style={
                      appointmentType === value
                        ? { backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }
                        : { backgroundColor: 'var(--color-input)', color: 'var(--color-muted-foreground)' }
                    }
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date (readonly) */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Fecha
              </label>
              <input
                type="date"
                value={date}
                readOnly
                className="rounded-lg px-3 py-2 text-sm outline-none opacity-60 cursor-not-allowed"
                style={inputStyle}
              />
            </div>

            {/* Start / End time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Hora inicio
                </label>
                <input
                  type="time"
                  value={startTime}
                  readOnly
                  className="rounded-lg px-3 py-2 text-sm outline-none opacity-60 cursor-not-allowed"
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Hora fin <span style={{ color: 'var(--color-admin)' }}>*</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Location — in_person only */}
            {appointmentType === 'in_person' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-foreground)' }}>
                  <MapPin size={13} />
                  Ubicación
                </label>
                <input
                  type="text"
                  name="location"
                  placeholder="Ej. Sala de pesas, planta baja"
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            )}

            {/* Meeting URL — virtual only */}
            {appointmentType === 'virtual' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--color-foreground)' }}>
                  <Video size={13} />
                  Enlace de reunión
                </label>
                <input
                  type="url"
                  name="meeting_url"
                  placeholder="https://meet.google.com/..."
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
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
                rows={3}
                placeholder="Observaciones adicionales..."
                className="rounded-lg px-3 py-2 text-sm outline-none resize-none"
                style={inputStyle}
              />
            </div>

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
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 border-t flex items-center justify-end gap-3 flex-shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}
            >
              {isPending ? 'Guardando...' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
