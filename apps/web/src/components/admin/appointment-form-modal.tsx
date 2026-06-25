'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Video, Phone, AlertCircle } from 'lucide-react'
import { createAppointmentAction } from '@/lib/admin/appointment-actions'

interface Props {
  coaches: Array<{ id: string; full_name: string }>
  clients: Array<{ id: string; full_name: string }>
  currentUserId?: string
  onClose: () => void
}

/** Round up to next 30-minute slot */
function nextSlot(): string {
  const now = new Date()
  const m = now.getMinutes()
  const bump = m < 30 ? 30 - m : 60 - m
  const next = new Date(now.getTime() + bump * 60000)
  return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + 60
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const TYPE_OPTIONS = [
  { value: 'in_person' as const, label: 'Presencial', Icon: MapPin },
  { value: 'virtual'   as const, label: 'Virtual',    Icon: Video  },
  { value: 'phone'     as const, label: 'Teléfono',   Icon: Phone  },
]

export default function AppointmentFormModal({ coaches, clients, currentUserId, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'in_person' | 'virtual' | 'phone'>('in_person')

  const defaultStart = nextSlot()
  const defaultEnd   = addHour(defaultStart)
  const [startTime, setStartTime] = useState(defaultStart)
  const [endTime, setEndTime]     = useState(defaultEnd)

  // Auto-assign current user as coach if they're in the coaches list
  const defaultCoach = coaches.find(c => c.id === currentUserId)?.id ?? ''
  const [coachId, setCoachId] = useState(defaultCoach)

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  function validate(date: string, clientId: string, title: string): string | null {
    if (!title.trim())    return 'El título de la cita es obligatorio.'
    if (!clientId)        return 'Debes seleccionar un cliente.'
    if (!date)            return 'La fecha es obligatoria.'

    const start = new Date(`${date}T${startTime}`)
    const end   = new Date(`${date}T${endTime}`)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Fecha u hora inválida.'

    // Must be today or later (allow 1h in the past for flexibility)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (start < oneHourAgo) return 'La hora de inicio no puede ser más de 1 hora en el pasado.'

    if (end <= start)     return 'La hora de fin debe ser posterior a la hora de inicio.'

    const durationMin = (end.getTime() - start.getTime()) / 60000
    if (durationMin < 15)  return 'La cita debe durar al menos 15 minutos.'
    if (durationMin > 480) return 'La cita no puede durar más de 8 horas.'

    return null
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const title    = (fd.get('title') as string ?? '').trim()
    const clientId = fd.get('client_id') as string
    const date     = fd.get('date') as string
    const location   = type === 'in_person' ? ((fd.get('location') as string) || null) : null
    const meetingUrl = type === 'virtual'   ? ((fd.get('meeting_url') as string) || null) : null
    const notes      = ((fd.get('notes') as string) || '').trim() || null

    const validationError = validate(date, clientId, title)
    if (validationError) { setError(validationError); return }

    const startDate = new Date(`${date}T${startTime}`)
    const endDate   = new Date(`${date}T${endTime}`)

    startTransition(async () => {
      try {
        const result = await createAppointmentAction({
          title,
          client_id:        clientId,
          coach_id:         coachId || null,
          start_time:       startDate.toISOString(),
          end_time:         endDate.toISOString(),
          appointment_type: type,
          location,
          meeting_url:      meetingUrl,
          description:      notes,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Nueva cita</h2>
            {defaultCoach && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                Asignada a ti como organizador
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:opacity-70 transition-opacity" style={{ color: 'var(--color-muted-foreground)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Título <span style={{ color: 'var(--color-admin)' }}>*</span>
              </label>
              <input
                type="text" name="title" required
                placeholder="Ej. Sesión de evaluación inicial"
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>

            {/* Client */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Cliente <span style={{ color: 'var(--color-admin)' }}>*</span>
              </label>
              <select name="client_id" required defaultValue="" className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}>
                <option value="" disabled>Seleccionar cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            {/* Coach — auto-assigned to creator if applicable */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Coach / Organizador
                {defaultCoach && (
                  <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-admin-light)', color: 'var(--color-admin)' }}>
                    Auto-asignado
                  </span>
                )}
              </label>
              <select
                value={coachId}
                onChange={e => setCoachId(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="">Sin asignar</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            {/* Appointment type */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Tipo de cita</label>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                {TYPE_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value} type="button" onClick={() => setType(value)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
                    style={type === value
                      ? { backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }
                      : { backgroundColor: 'var(--color-input)', color: 'var(--color-muted-foreground)' }}
                  >
                    <Icon size={12} />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Fecha <span style={{ color: 'var(--color-admin)' }}>*</span>
              </label>
              <input
                type="date" name="date" required
                defaultValue={new Date().toLocaleDateString('en-CA')}
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>

            {/* Start / End time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Hora inicio <span style={{ color: 'var(--color-admin)' }}>*</span>
                </label>
                <input
                  type="time" value={startTime} required
                  onChange={e => {
                    setStartTime(e.target.value)
                    setEndTime(addHour(e.target.value))
                  }}
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Hora fin <span style={{ color: 'var(--color-admin)' }}>*</span>
                </label>
                <input
                  type="time" value={endTime} required
                  onChange={e => setEndTime(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Conditional fields */}
            {type === 'in_person' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Ubicación</label>
                <input type="text" name="location" placeholder="Ej. Sala de pesas, planta baja" className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
            )}
            {type === 'virtual' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Enlace de reunión</label>
                <input type="url" name="meeting_url" placeholder="https://meet.google.com/..." className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Notas</label>
              <textarea name="notes" rows={2} placeholder="Observaciones adicionales..." className="rounded-lg px-3 py-2 text-sm outline-none resize-none" style={inputStyle} />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', color: 'var(--color-destructive)', border: '1px solid color-mix(in srgb, var(--color-destructive) 25%, transparent)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-end gap-3 flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}>
              {isPending ? 'Guardando…' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
