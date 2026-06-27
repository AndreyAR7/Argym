'use client'

import { useState, useTransition, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MapPin, Video, Phone, AlertCircle, Search, X, Users } from 'lucide-react'
import { createAppointmentAction } from '@/lib/admin/appointment-actions'

interface Client { id: string; full_name: string }

interface Props {
  clients:    Client[]
  coachId:    string
  coachName:  string
}

function nextSlot(): string {
  const now  = new Date()
  const m    = now.getMinutes()
  const bump = m < 30 ? 30 - m : 60 - m
  const next = new Date(now.getTime() + bump * 60000)
  return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`
}
function addHour(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const tot = h * 60 + m + 60
  return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
}

const TYPES = [
  { value: 'in_person' as const, label: 'Presencial', Icon: MapPin },
  { value: 'virtual'   as const, label: 'Virtual',    Icon: Video  },
  { value: 'phone'     as const, label: 'Teléfono',   Icon: Phone  },
]

function ClientCombobox({
  clients, selected, onSelect, onRemove,
}: {
  clients:  Client[]
  selected: Client[]
  onSelect: (c: Client) => void
  onRemove: (id: string) => void
}) {
  const [q, setQ]       = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef         = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const selectedIds = useMemo(() => new Set(selected.map(s => s.id)), [selected])

  const results = useMemo(() => {
    if (!q.trim()) return []
    const lower = q.toLowerCase()
    return clients.filter(c => !selectedIds.has(c.id) && c.full_name.toLowerCase().includes(lower)).slice(0, 8)
  }, [q, clients, selectedIds])

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  return (
    <div ref={wrapRef} className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {selected.map(s => (
            <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'var(--color-coach-light)', color: 'var(--color-coach)' }}>
              {s.full_name}
              <button type="button" onClick={() => onRemove(s.id)} className="hover:opacity-70 ml-0.5">
                <X size={9} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--color-muted-foreground)' }} />
        <input
          type="text" value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente por nombre…"
          className="w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
      </div>

      {open && q.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border shadow-lg overflow-hidden"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-center" style={{ color: 'var(--color-muted-foreground)' }}>
              Sin coincidencias para &ldquo;{q}&rdquo;
            </p>
          ) : results.map(r => (
            <button key={r.id} type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-muted)]"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(r); setQ('') }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: 'var(--color-coach)' }}>
                {r.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm" style={{ color: 'var(--color-foreground)' }}>{r.full_name}</span>
            </button>
          ))}
        </div>
      )}

      {open && !q.trim() && selected.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border px-3 py-3"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Escribe para buscar…</p>
        </div>
      )}
    </div>
  )
}

function AppointmentModal({ clients, coachId, coachName, onClose }: Props & { onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState<string | null>(null)
  const [type, setType]     = useState<'in_person' | 'virtual' | 'phone'>('in_person')
  const [selectedClients, setSelectedClients] = useState<Client[]>([])

  const start0 = nextSlot()
  const [startTime, setStartTime] = useState(start0)
  const [endTime,   setEndTime]   = useState(addHour(start0))

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  function validate(date: string, title: string): string | null {
    if (!title.trim())               return 'El título de la cita es obligatorio.'
    if (selectedClients.length === 0) return 'Debes seleccionar al menos un cliente.'
    if (!date)                       return 'La fecha es obligatoria.'

    const start = new Date(`${date}T${startTime}:00`)
    const end   = new Date(`${date}T${endTime}:00`)
    if (isNaN(start.getTime())) return 'La fecha o la hora ingresada no es válida.'
    if (end <= start)           return 'La hora de fin debe ser posterior a la hora de inicio.'

    const dur = (end.getTime() - start.getTime()) / 60000
    if (dur < 15)  return 'La duración mínima de una cita es 15 minutos.'
    if (dur > 480) return 'La duración máxima de una cita es 8 horas.'

    const now      = new Date()
    const todayStr = now.toLocaleDateString('en-CA')
    if (date < todayStr) return `No se puede crear una cita en una fecha pasada (${date}).`

    if (date === todayStr) {
      const oneHourAgo = new Date(now.getTime() - 3600000)
      if (start < oneHourAgo) {
        const limit = oneHourAgo.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
        return `La hora de inicio no puede ser anterior a las ${limit} (máximo 1 hora en el pasado).`
      }
    }

    return null
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const title      = (fd.get('title') as string ?? '').trim()
    const date       = fd.get('date') as string
    const location   = type === 'in_person' ? ((fd.get('location')    as string) || null) : null
    const meetingUrl = type === 'virtual'   ? ((fd.get('meeting_url') as string) || null) : null
    const notes      = ((fd.get('notes') as string) || '').trim() || null

    const err = validate(date, title)
    if (err) { setError(err); return }

    const startISO = new Date(`${date}T${startTime}`).toISOString()
    const endISO   = new Date(`${date}T${endTime}`).toISOString()

    startTransition(async () => {
      try {
        const result = await createAppointmentAction({
          title,
          client_id:        selectedClients[0].id,
          coach_id:         coachId,
          start_time:       startISO,
          end_time:         endISO,
          appointment_type: type,
          location,
          meeting_url:      meetingUrl,
          description:      notes,
          participant_ids:  selectedClients.map(c => c.id),
        })
        if (result?.error) { setError(result.error) }
        else { router.refresh(); onClose() }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error inesperado.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[92vh]"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Nueva cita</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
              Organizada por ti · {coachName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Título <span style={{ color: 'var(--color-coach)' }}>*</span>
              </label>
              <input type="text" name="title" required placeholder="Ej. Sesión de evaluación inicial"
                className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
            </div>

            {/* Clients */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-foreground)' }}>
                <Users size={13} />
                Clientes <span style={{ color: 'var(--color-coach)' }}>*</span>
                {selectedClients.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: 'var(--color-coach)', color: 'white' }}>
                    {selectedClients.length}
                  </span>
                )}
              </label>
              <ClientCombobox
                clients={clients}
                selected={selectedClients}
                onSelect={c => setSelectedClients(prev => prev.find(x => x.id === c.id) ? prev : [...prev, c])}
                onRemove={id => setSelectedClients(prev => prev.filter(c => c.id !== id))}
              />
            </div>

            {/* Appointment type */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Tipo de cita</label>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                {TYPES.map(({ value, label, Icon }) => (
                  <button key={value} type="button" onClick={() => setType(value)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
                    style={type === value
                      ? { backgroundColor: 'var(--color-coach)', color: 'white' }
                      : { backgroundColor: 'var(--color-input)', color: 'var(--color-muted-foreground)' }}>
                    <Icon size={12} />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date + Times */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Fecha <span style={{ color: 'var(--color-coach)' }}>*</span>
                </label>
                <input type="date" name="date" required
                  defaultValue={new Date().toLocaleDateString('en-CA')}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Inicio <span style={{ color: 'var(--color-coach)' }}>*</span>
                </label>
                <input type="time" value={startTime} required
                  onChange={e => { setStartTime(e.target.value); setEndTime(addHour(e.target.value)) }}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Fin <span style={{ color: 'var(--color-coach)' }}>*</span>
                </label>
                <input type="time" value={endTime} required onChange={e => setEndTime(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
            </div>

            {/* Conditional fields */}
            {type === 'in_person' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Ubicación</label>
                <input type="text" name="location" placeholder="Ej. Sala de pesas, planta baja"
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
            )}
            {type === 'virtual' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Enlace de reunión</label>
                <input type="url" name="meeting_url" placeholder="https://meet.google.com/…"
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Notas</label>
              <textarea name="notes" rows={2} placeholder="Observaciones adicionales…"
                className="rounded-lg px-3 py-2 text-sm outline-none resize-none" style={inputStyle} />
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
          <div className="px-6 py-4 border-t flex items-center justify-end gap-3 flex-shrink-0"
            style={{ borderColor: 'var(--color-border)' }}>
            <button type="button" onClick={onClose} disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-coach)', color: 'white' }}>
              {isPending ? 'Guardando…' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CoachNewAppointmentButton({ clients, coachId, coachName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
        style={{ backgroundColor: 'var(--color-coach)', color: 'white' }}>
        <Plus size={16} />
        Nueva cita
      </button>

      {open && (
        <AppointmentModal
          clients={clients}
          coachId={coachId}
          coachName={coachName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
