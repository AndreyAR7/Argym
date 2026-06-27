'use client'

import { useState, useTransition, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Video, Phone, AlertCircle, Search, X, Trash2, Users, ChevronDown, CalendarClock } from 'lucide-react'
import { updateAppointmentAction, deleteAppointmentAction } from '@/lib/admin/appointment-actions'

export interface AppointmentForEdit {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  status: 'pending_confirmation' | 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled' | 'postpone_requested'
  appointment_type: 'in_person' | 'virtual' | 'phone'
  location: string | null
  meeting_url: string | null
  group_mode: string
  coach_id: string | null
  coach_name: string | null
  client_id: string | null
  client_name: string | null
  participants: Array<{ id: string; full_name: string; avatar_url: string | null }>
}

interface Coach  { id: string; full_name: string }
interface Client { id: string; full_name: string }

interface Props {
  appointment: AppointmentForEdit
  coaches:     Coach[]
  clients:     Client[]
  onClose:     () => void
}

function isoToLocalDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA')
}

function isoToTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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

const STATUSES = [
  { value: 'pending_confirmation' as const, label: 'Pendiente de confirmación' },
  { value: 'scheduled'            as const, label: 'Programada'                },
  { value: 'confirmed'            as const, label: 'Confirmada'                },
  { value: 'completed'            as const, label: 'Completada'                },
  { value: 'no_show'              as const, label: 'No asistió'                },
  { value: 'cancelled'            as const, label: 'Cancelada'                 },
  { value: 'postpone_requested'   as const, label: 'Cambio solicitado'         },
]

// ── Search-as-you-type combobox ─────────────────────────────────
function Combobox({
  placeholder, items, selected, onSelect, onRemove, multi = true,
}: {
  placeholder: string
  items: { id: string; full_name: string }[]
  selected: { id: string; full_name: string }[]
  onSelect: (item: { id: string; full_name: string }) => void
  onRemove: (id: string) => void
  multi?: boolean
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
    return items.filter(i => !selectedIds.has(i.id) && i.full_name.toLowerCase().includes(lower)).slice(0, 8)
  }, [q, items, selectedIds])

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
              style={{ backgroundColor: 'var(--color-admin-light)', color: 'var(--color-admin)' }}>
              {s.full_name}
              <button type="button" onClick={() => onRemove(s.id)} className="hover:opacity-70 ml-0.5">
                <X size={9} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
      )}
      {(multi || selected.length === 0) && (
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-muted-foreground)' }} />
          <input
            type="text" value={q}
            onChange={e => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      )}
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
              onClick={() => { onSelect(r); setQ(''); if (!multi) setOpen(false) }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: 'var(--color-admin)' }}>
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

// ── Main Modal ──────────────────────────────────────────────────
export default function AppointmentEditModal({ appointment, coaches, clients, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError]           = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [type, setType]       = useState(appointment.appointment_type)
  const [status, setStatus]   = useState(appointment.status)
  const [startTime, setStartTime] = useState(isoToTime(appointment.start_time))
  const [endTime, setEndTime]     = useState(isoToTime(appointment.end_time))

  const initCoach = appointment.coach_id && appointment.coach_name
    ? { id: appointment.coach_id, full_name: appointment.coach_name }
    : null
  const [selectedCoach, setSelectedCoach] = useState<{ id: string; full_name: string } | null>(initCoach)

  const initClients: { id: string; full_name: string }[] =
    appointment.group_mode === 'group' && appointment.participants.length > 0
      ? appointment.participants.map(p => ({ id: p.id, full_name: p.full_name }))
      : appointment.client_id && appointment.client_name
        ? [{ id: appointment.client_id, full_name: appointment.client_name }]
        : []
  const [selectedClients, setSelectedClients] = useState(initClients)

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  function validate(date: string, title: string): string | null {
    if (!title.trim())                return 'El título es obligatorio.'
    if (selectedClients.length === 0) return 'Debes seleccionar al menos un cliente.'
    if (!date)                        return 'La fecha es obligatoria.'
    const start = new Date(`${date}T${startTime}:00`)
    const end   = new Date(`${date}T${endTime}:00`)
    if (isNaN(start.getTime()))       return 'Fecha u hora inválida.'
    if (end <= start)                 return 'La hora de fin debe ser posterior a la hora de inicio.'
    const dur = (end.getTime() - start.getTime()) / 60000
    if (dur < 15)  return 'Duración mínima: 15 minutos.'
    if (dur > 480) return 'Duración máxima: 8 horas.'
    return null
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const title       = (fd.get('title') as string ?? '').trim()
    const date        = fd.get('date') as string
    const location    = type === 'in_person' ? ((fd.get('location')    as string) || null) : null
    const meeting_url = type === 'virtual'   ? ((fd.get('meeting_url') as string) || null) : null
    const description = ((fd.get('description') as string) || '').trim() || null

    const err = validate(date, title)
    if (err) { setError(err); return }

    const start_time = new Date(`${date}T${startTime}`).toISOString()
    const end_time   = new Date(`${date}T${endTime}`).toISOString()

    startTransition(async () => {
      try {
        const result = await updateAppointmentAction(appointment.id, {
          title,
          start_time,
          end_time,
          status,
          appointment_type: type,
          coach_id:    selectedCoach?.id ?? null,
          client_id:   selectedClients[0]?.id ?? null,
          location,
          meeting_url,
          description,
        })
        if (result?.error) { setError(result.error) }
        else { router.refresh(); onClose() }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error inesperado.')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteAppointmentAction(appointment.id)
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
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Editar cita</h2>
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
                Título <span style={{ color: 'var(--color-admin)' }}>*</span>
              </label>
              <input type="text" name="title" required
                defaultValue={appointment.title}
                placeholder="Ej. Sesión de evaluación inicial"
                className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
            </div>

            {/* Clients */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-foreground)' }}>
                <Users size={13} />
                Clientes <span style={{ color: 'var(--color-admin)' }}>*</span>
                {selectedClients.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
                    {selectedClients.length}
                  </span>
                )}
              </label>
              <Combobox
                placeholder="Buscar cliente por nombre…"
                items={clients}
                selected={selectedClients}
                onSelect={c => setSelectedClients(prev => prev.find(x => x.id === c.id) ? prev : [...prev, c])}
                onRemove={id => setSelectedClients(prev => prev.filter(c => c.id !== id))}
                multi={true}
              />
            </div>

            {/* Coach */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Coach / Organizador</label>
              <Combobox
                placeholder="Buscar coach por nombre…"
                items={coaches}
                selected={selectedCoach ? [selectedCoach] : []}
                onSelect={c => setSelectedCoach(c)}
                onRemove={() => setSelectedCoach(null)}
                multi={false}
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Estado</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as typeof status)}
                  className="w-full appearance-none rounded-lg px-3 py-2 pr-8 text-sm outline-none"
                  style={inputStyle}
                >
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--color-muted-foreground)' }} />
              </div>
            </div>

            {/* Postpone request banner */}
            {appointment.status === 'postpone_requested' && (
              <div className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 10%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)' }}>
                <CalendarClock size={16} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>El cliente solicitó posponer esta cita</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    Edita la fecha y hora, luego guarda. El cliente recibirá la nueva propuesta.
                  </p>
                </div>
              </div>
            )}

            {/* Appointment type */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Tipo de cita</label>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                {TYPES.map(({ value, label, Icon }) => (
                  <button key={value} type="button" onClick={() => setType(value)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors"
                    style={type === value
                      ? { backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }
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
                  Fecha <span style={{ color: 'var(--color-admin)' }}>*</span>
                </label>
                <input type="date" name="date" required
                  defaultValue={isoToLocalDate(appointment.start_time)}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Inicio <span style={{ color: 'var(--color-admin)' }}>*</span>
                </label>
                <input type="time" value={startTime} required
                  onChange={e => { setStartTime(e.target.value); setEndTime(addHour(e.target.value)) }}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Fin <span style={{ color: 'var(--color-admin)' }}>*</span>
                </label>
                <input type="time" value={endTime} required onChange={e => setEndTime(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
            </div>

            {/* Conditional location / meeting_url */}
            {type === 'in_person' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Ubicación</label>
                <input type="text" name="location" placeholder="Ej. Sala de pesas, planta baja"
                  defaultValue={appointment.location ?? ''}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
            )}
            {type === 'virtual' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Enlace de reunión</label>
                <input type="url" name="meeting_url" placeholder="https://meet.google.com/…"
                  defaultValue={appointment.meeting_url ?? ''}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
            )}

            {/* Notes / description */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Notas</label>
              <textarea name="description" rows={2} placeholder="Observaciones adicionales…"
                defaultValue={appointment.description ?? ''}
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

            {/* Delete confirmation */}
            {confirmDelete && (
              <div className="rounded-lg px-4 py-3 flex flex-col gap-3"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-destructive) 25%, transparent)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>
                  ¿Eliminar esta cita permanentemente?
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleDelete} disabled={isPending}
                    className="flex-1 rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-destructive)', color: 'white' }}>
                    {isPending ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} disabled={isPending}
                    className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0"
            style={{ borderColor: 'var(--color-border)' }}>
            {!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)} disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ color: 'var(--color-destructive)' }}>
                <Trash2 size={14} />
                Eliminar
              </button>
            ) : <div />}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}>
                {isPending ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
