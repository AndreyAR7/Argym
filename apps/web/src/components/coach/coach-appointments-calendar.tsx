'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, MapPin, Video, Phone, Users, X, FileText, Pencil, Trash2, UserPlus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { MapLinks } from '@/components/shared/map-links'
import { CoachAppointmentModal } from '@/components/coach/coach-new-appointment-button'
import {
  updateCoachAppointmentAction,
  cancelCoachAppointmentAction,
  addCoachAppointmentParticipantAction,
  removeCoachAppointmentParticipantAction,
} from '@/lib/coach/appointment-actions'

interface Participant { id: string; full_name: string; avatar_url: string | null; status?: string }

interface Appointment {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  status: string
  appointment_type: 'in_person' | 'virtual' | 'phone'
  location: string | null
  meeting_url: string | null
  group_mode: string
  coach_id: string | null
  coach_name: string | null
  client_id: string | null
  client_name: string | null
  client_avatar: string | null
  max_participants: number | null
  participants: Participant[]
  is_own: boolean
}

interface Client { id: string; full_name: string }

interface Props {
  appointments: Appointment[]
  weekStart: string
  clients:    Client[]
  coachId:    string
  coachName:  string
}

interface SlotClick { date: string; time: string }

const HOUR_START = 6
const HOUR_END   = 22
const PX_PER_MIN = 1.3
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * 60 * PX_PER_MIN

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  in_person: { bg: 'color-mix(in srgb, var(--color-coach) 14%, white)',  border: 'var(--color-coach)',  text: 'var(--color-coach)'  },
  virtual:   { bg: 'color-mix(in srgb, var(--color-admin) 14%, white)',  border: 'var(--color-admin)',  text: 'var(--color-admin)'  },
  phone:     { bg: 'color-mix(in srgb, var(--color-client) 14%, white)', border: 'var(--color-client)', text: 'var(--color-client)' },
}

const TYPE_LABEL: Record<string, string> = { in_person: 'Presencial', virtual: 'Virtual', phone: 'Teléfono' }
const TYPE_ICON: Record<string, React.ReactNode> = { in_person: <MapPin size={13} />, virtual: <Video size={13} />, phone: <Phone size={13} /> }

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function topForTime(iso: string): number {
  const d = new Date(iso)
  const mins = d.getHours() * 60 + d.getMinutes()
  return Math.max(0, (mins - HOUR_START * 60) * PX_PER_MIN)
}

function heightForDuration(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(24, (ms / 60000) * PX_PER_MIN)
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoToLocalDateStr(iso: string): string {
  return localDateStr(new Date(iso))
}

function nowTop(): number | null {
  const now = new Date()
  const h = now.getHours(); const m = now.getMinutes()
  if (h < HOUR_START || h >= HOUR_END) return null
  return (h * 60 + m - HOUR_START * 60) * PX_PER_MIN
}

// Overlap layout: places same-day overlapping appointments into columns
// side by side instead of stacking on top of each other.
function layoutDay(dayApts: Appointment[]) {
  const sorted = [...dayApts].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  const columns: Appointment[][] = []
  for (const apt of sorted) {
    const aptStart = new Date(apt.start_time).getTime()
    let placed = false
    for (const col of columns) {
      const lastEnd = new Date(col[col.length - 1].end_time).getTime()
      if (aptStart >= lastEnd) { col.push(apt); placed = true; break }
    }
    if (!placed) columns.push([apt])
  }
  const result = new Map<string, { col: number; totalCols: number }>()
  for (let ci = 0; ci < columns.length; ci++) {
    for (const apt of columns[ci]) {
      const aptStart = new Date(apt.start_time).getTime()
      const aptEnd   = new Date(apt.end_time).getTime()
      const total = columns.reduce((acc, c) =>
        acc + (c.some(a => {
          const s = new Date(a.start_time).getTime()
          const e = new Date(a.end_time).getTime()
          return s < aptEnd && e > aptStart
        }) ? 1 : 0)
      , 0)
      result.set(apt.id, { col: ci, totalCols: Math.max(1, total) })
    }
  }
  return result
}

export function CoachAppointmentsCalendar({ appointments, weekStart, clients, coachId, coachName }: Props) {
  const router = useRouter()
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null)
  const [slotClick, setSlotClick] = useState<SlotClick | null>(null)
  const [currentTopPx, setCurrentTopPx] = useState<number | null>(nowTop)

  useEffect(() => {
    const id = setInterval(() => setCurrentTopPx(nowTop()), 60_000)
    return () => clearInterval(id)
  }, [])

  const baseDate = new Date(`${weekStart}T00:00:00`)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate); d.setDate(baseDate.getDate() + i); return d
  })
  const todayStr = localDateStr(new Date())

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dateStr: string) {
    if ((e.target as HTMLElement).closest('[data-apt]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    if (y < 0 || y > TOTAL_HEIGHT) return
    const mins = Math.floor(y / PX_PER_MIN) + HOUR_START * 60
    const h = Math.min(Math.floor(mins / 60), HOUR_END - 1)
    const m = Math.floor((mins % 60) / 30) * 30
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    if (dateStr === todayStr) {
      const clicked = new Date(`${dateStr}T${time}:00`)
      if (clicked < new Date()) return // slot already passed today
    }

    setSelectedApt(null)
    setSlotClick({ date: dateStr, time })
  }

  function prevWeek() { const d = new Date(baseDate); d.setDate(d.getDate() - 7); router.push(`?view=calendar&week=${localDateStr(d)}`) }
  function nextWeek() { const d = new Date(baseDate); d.setDate(d.getDate() + 7); router.push(`?view=calendar&week=${localDateStr(d)}`) }

  const aptsByDate: Record<string, Appointment[]> = {}
  for (const apt of appointments) {
    const k = isoToLocalDateStr(apt.start_time)
    if (!aptsByDate[k]) aptsByDate[k] = []
    aptsByDate[k].push(apt)
  }

  const ownCount = appointments.filter(a => a.is_own).length

  const monthLabel = new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric' }).format(baseDate)
  const weekEndDate = new Date(baseDate); weekEndDate.setDate(baseDate.getDate() + 6)
  const weekRangeLabel = `${baseDate.getDate()} – ${weekEndDate.getDate()} ${new Intl.DateTimeFormat('es-CR', { month: 'long' }).format(weekEndDate)}`

  return (
    <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-card)]">
      {/* Week header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-foreground)] capitalize">{monthLabel}</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">({weekRangeLabel})</span>
          {ownCount > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-coach)', color: 'white' }}>
              {ownCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevWeek} className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => router.push('?view=calendar')} className="px-2.5 py-1 text-xs font-medium rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] transition-colors">
            Hoy
          </button>
          <button onClick={nextWeek} className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid border-b border-[var(--color-border)] sticky top-0 z-10 bg-[var(--color-card)]" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
        <div className="border-r border-[var(--color-border)]" />
        {days.map((d, i) => {
          const dateStr = localDateStr(d)
          const isToday = dateStr === todayStr
          return (
            <div key={i} className="py-2 text-center border-r border-[var(--color-border)] last:border-r-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>{DAY_LABELS[i]}</p>
              <div className="mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold"
                style={isToday ? { backgroundColor: 'var(--color-coach)', color: 'white' } : { color: 'var(--color-foreground)' }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {ownCount === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>Sin citas esta semana</p>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Haz clic en cualquier celda del calendario para crear una cita.</p>
        </div>
      )}

      {/* Scrollable grid */}
      <div className="overflow-y-auto" style={{ maxHeight: '580px' }}>
        <div className="grid relative" style={{ gridTemplateColumns: '44px repeat(7, 1fr)', height: `${TOTAL_HEIGHT}px` }}>
          {/* Time labels */}
          <div className="relative border-r border-[var(--color-border)]">
            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
              <div key={i} className="absolute right-1.5 text-[10px] tabular-nums"
                style={{ top: `${i * 60 * PX_PER_MIN - 6}px`, color: 'var(--color-muted-foreground)' }}>
                {String(HOUR_START + i).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const dateStr = localDateStr(d)
            const dayApts = aptsByDate[dateStr] ?? []
            const isToday = dateStr === todayStr
            const layout = layoutDay(dayApts)

            return (
              <div key={di}
                className="relative border-r border-[var(--color-border)] last:border-r-0 cursor-crosshair"
                style={isToday ? { backgroundColor: 'color-mix(in srgb, var(--color-coach) 3%, transparent)' } : undefined}
                onClick={e => handleColumnClick(e, dateStr)}
              >
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={`h${i}`} className="absolute inset-x-0 border-t" style={{ top: `${i * 60 * PX_PER_MIN}px`, borderColor: 'var(--color-border)' }} />
                ))}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={`hh${i}`} className="absolute inset-x-0 border-t border-dashed opacity-35"
                    style={{ top: `${(i * 60 + 30) * PX_PER_MIN}px`, borderColor: 'var(--color-border)' }} />
                ))}

                {isToday && currentTopPx !== null && (
                  <div className="absolute inset-x-0 z-10 pointer-events-none flex items-center" style={{ top: `${currentTopPx}px` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 -ml-1" style={{ backgroundColor: '#ef4444' }} />
                    <div className="flex-1 h-px" style={{ backgroundColor: '#ef4444' }} />
                  </div>
                )}

                {dayApts.map(apt => {
                  const top    = topForTime(apt.start_time)
                  const height = heightForDuration(apt.start_time, apt.end_time)
                  const colors = TYPE_COLORS[apt.appointment_type] ?? TYPE_COLORS.in_person
                  const lInfo  = layout.get(apt.id) ?? { col: 0, totalCols: 1 }
                  const width  = 100 / lInfo.totalCols
                  const left   = width * lInfo.col

                  const startD  = new Date(apt.start_time)
                  const timeStr = `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`
                  const isGroup = apt.group_mode === 'group'

                  // Another coach's appointment — dimmed, non-interactive,
                  // no client-identifying details (see list_appointments).
                  if (!apt.is_own) {
                    return (
                      <div key={apt.id}
                        className="absolute overflow-hidden px-1 py-0.5 rounded opacity-40"
                        style={{
                          top: `${top}px`, height: `${height}px`, left: `${left + 0.5}%`, width: `${width - 1}%`,
                          backgroundColor: 'var(--color-muted-foreground)', borderLeft: '3px solid var(--color-muted-foreground)',
                        }}
                      >
                        <p className="text-[10px] font-semibold truncate leading-tight text-white">Ocupado</p>
                        {height > 36 && (
                          <p className="text-[9px] truncate leading-tight text-white/80">{timeStr} · {apt.coach_name ?? 'Otro coach'}</p>
                        )}
                      </div>
                    )
                  }

                  const nameStr = isGroup
                    ? (apt.max_participants != null ? `${apt.participants.length}/${apt.max_participants} cupos` : `${apt.participants.length} clientes`)
                    : (apt.client_name ?? '—')

                  return (
                    <div key={apt.id} data-apt="1"
                      className="absolute overflow-hidden px-1 py-0.5 rounded cursor-pointer transition-all hover:brightness-95 hover:shadow-md"
                      style={{
                        top: `${top}px`, height: `${height}px`, left: `${left + 0.5}%`, width: `${width - 1}%`,
                        backgroundColor: colors.bg, borderLeft: `3px solid ${colors.border}`,
                      }}
                      onClick={e => { e.stopPropagation(); setSlotClick(null); setSelectedApt(apt) }}
                    >
                      <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: colors.text }}>{apt.title}</p>
                      {height > 36 && (
                        <p className="text-[9px] truncate leading-tight opacity-80" style={{ color: colors.text }}>{timeStr} · {nameStr}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {selectedApt && (
        <CoachAppointmentDetailModal
          appointment={selectedApt}
          clients={clients}
          onClose={() => setSelectedApt(null)}
        />
      )}

      {slotClick && (
        <CoachAppointmentModal
          clients={clients}
          coachId={coachId}
          coachName={coachName}
          initialDate={slotClick.date}
          initialTime={slotClick.time}
          onClose={() => setSlotClick(null)}
        />
      )}
    </div>
  )
}

// Editable detail view for the coach's own appointment: reschedule, edit
// location/meeting link/notes, add or remove participants, cancel. A
// reduced field set on purpose — no title/status-machine/coach-
// reassignment/hard delete, that stays admin-only (appointment-edit-modal.tsx).
function CoachAppointmentDetailModal({
  appointment, clients, onClose,
}: { appointment: Appointment; clients: Client[]; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [addQuery, setAddQuery] = useState('')

  const start = new Date(appointment.start_time)
  const end   = new Date(appointment.end_time)
  const dateLabel = start.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = `${start.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`
  const isGroup = appointment.group_mode === 'group'
  const isTerminal = appointment.status === 'cancelled' || appointment.status === 'completed'

  const [dateStr, setDateStr] = useState(localDateStr(start))
  const [startTime, setStartTime] = useState(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`)
  const [endTime, setEndTime] = useState(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`)
  const [location, setLocation] = useState(appointment.location ?? '')
  const [meetingUrl, setMeetingUrl] = useState(appointment.meeting_url ?? '')
  const [notes, setNotes] = useState(appointment.description ?? '')

  const existingIds = new Set(appointment.participants.map(p => p.id))
  const addResults = addQuery.trim()
    ? clients.filter(c => !existingIds.has(c.id) && c.full_name.toLowerCase().includes(addQuery.toLowerCase())).slice(0, 6)
    : []

  function handleSave() {
    setError(null)
    const startISO = new Date(`${dateStr}T${startTime}`).toISOString()
    const endISO   = new Date(`${dateStr}T${endTime}`).toISOString()
    if (new Date(endISO) <= new Date(startISO)) {
      setError('La hora de fin debe ser posterior a la de inicio.')
      return
    }
    startTransition(async () => {
      const result = await updateCoachAppointmentAction(appointment.id, {
        start_time: startISO,
        end_time: endISO,
        location: appointment.appointment_type === 'in_person' ? (location.trim() || null) : appointment.location,
        meeting_url: appointment.appointment_type === 'virtual' ? (meetingUrl.trim() || null) : appointment.meeting_url,
        description: notes.trim() || null,
      })
      if (result?.error) { setError(result.error); return }
      router.refresh()
      onClose()
    })
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelCoachAppointmentAction(appointment.id)
      if (result?.error) { setError(result.error); return }
      router.refresh()
      onClose()
    })
  }

  function handleAddParticipant(clientId: string) {
    startTransition(async () => {
      const result = await addCoachAppointmentParticipantAction(appointment.id, clientId)
      if (result?.error) { setError(result.error); return }
      setAddQuery('')
      router.refresh()
    })
  }

  function handleRemoveParticipant(clientId: string) {
    startTransition(async () => {
      const result = await removeCoachAppointmentParticipantAction(appointment.id, clientId)
      if (result?.error) { setError(result.error); return }
      router.refresh()
    })
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>{appointment.title}</h2>
          <div className="flex items-center gap-1">
            {!isTerminal && !editing && (
              <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 hover:opacity-70" style={{ color: 'var(--color-coach)' }} title="Editar">
                <Pencil size={16} />
              </button>
            )}
            <button onClick={onClose} style={{ color: 'var(--color-muted-foreground)' }}><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Badge value={appointment.status} />
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {TYPE_ICON[appointment.appointment_type]}
              {TYPE_LABEL[appointment.appointment_type] ?? appointment.appointment_type}
            </span>
          </div>

          {editing ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1 col-span-3 sm:col-span-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>Fecha</label>
                  <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)}
                    className="rounded-lg px-2.5 py-2 text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>Inicio</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="rounded-lg px-2.5 py-2 text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>Fin</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="rounded-lg px-2.5 py-2 text-sm outline-none" style={inputStyle} />
                </div>
              </div>

              {appointment.appointment_type === 'in_person' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>Ubicación</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="Ej. Local N.° 7, Plaza Andes, Santa Ana"
                    className="rounded-lg px-2.5 py-2 text-sm outline-none" style={inputStyle} />
                </div>
              )}
              {appointment.appointment_type === 'virtual' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>Enlace de reunión</label>
                  <input type="url" value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)}
                    className="rounded-lg px-2.5 py-2 text-sm outline-none" style={inputStyle} />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="rounded-lg px-2.5 py-2 text-sm outline-none resize-none" style={inputStyle} />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium capitalize" style={{ color: 'var(--color-foreground)' }}>{dateLabel}</p>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{timeLabel}</p>
            </div>
          )}

          {/* Participants — editable list + add */}
          <div>
            <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
              <Users size={12} />
              {isGroup ? `Participantes (${appointment.participants.length}${appointment.max_participants != null ? `/${appointment.max_participants}` : ''})` : 'Cliente'}
            </p>
            <div className="flex flex-col gap-1.5">
              {appointment.participants.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={p.full_name} src={p.avatar_url} size="sm" className="bg-[var(--color-coach-light)]" />
                    <span className="text-sm truncate" style={{ color: 'var(--color-foreground)' }}>{p.full_name}</span>
                  </div>
                  {editing && (
                    <button onClick={() => handleRemoveParticipant(p.id)} disabled={isPending}
                      className="flex-shrink-0 rounded-md p-1 hover:bg-red-50" style={{ color: 'var(--color-destructive)' }} title="Quitar">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
              {appointment.participants.length === 0 && !isGroup && appointment.client_name && (
                <div className="flex items-center gap-2">
                  <Avatar name={appointment.client_name} src={appointment.client_avatar} size="sm" className="bg-[var(--color-coach-light)]" />
                  <span className="text-sm" style={{ color: 'var(--color-foreground)' }}>{appointment.client_name}</span>
                </div>
              )}
              {appointment.participants.length === 0 && !appointment.client_name && (
                <p className="text-xs italic" style={{ color: 'var(--color-muted-foreground)' }}>Sin participantes registrados</p>
              )}
            </div>

            {editing && (
              <div className="relative mt-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
                <input
                  type="text" value={addQuery} onChange={e => setAddQuery(e.target.value)}
                  placeholder="Agregar cliente…"
                  className="w-full rounded-lg pl-7 pr-2.5 py-1.5 text-xs outline-none" style={inputStyle}
                />
                {addResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                    {addResults.map(c => (
                      <button key={c.id} type="button" disabled={isPending}
                        onClick={() => handleAddParticipant(c.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--color-muted)]">
                        <UserPlus size={12} style={{ color: 'var(--color-coach)' }} />
                        {c.full_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {appointment.location && !editing && (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-foreground)' }}>
                <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-muted-foreground)' }} />
                {appointment.location}
              </div>
              <MapLinks location={appointment.location} />
            </div>
          )}
          {appointment.meeting_url && !editing && (
            <a href={appointment.meeting_url} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-2 text-sm hover:underline" style={{ color: 'var(--color-coach)' }}>
              <Video size={14} className="flex-shrink-0 mt-0.5" />
              {appointment.meeting_url}
            </a>
          )}
          {appointment.description && !editing && (
            <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-foreground)' }}>
              <FileText size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-muted-foreground)' }} />
              {appointment.description}
            </div>
          )}

          {error && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', color: 'var(--color-destructive)' }}>
              {error}
            </p>
          )}

          {confirmCancel ? (
            <div className="flex flex-col gap-2 rounded-lg p-3" style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 6%, transparent)' }}>
              <p className="text-xs" style={{ color: 'var(--color-foreground)' }}>¿Cancelar esta cita?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancel(false)} disabled={isPending}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                  No
                </button>
                <button onClick={handleCancel} disabled={isPending}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium text-white" style={{ backgroundColor: 'var(--color-destructive)' }}>
                  {isPending ? '…' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          ) : editing ? (
            <div className="flex gap-2">
              <button onClick={() => setConfirmCancel(true)} disabled={isPending}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-destructive)' }}>
                <Trash2 size={13} />
                Cancelar cita
              </button>
              <div className="flex-1" />
              <button onClick={() => setEditing(false)} disabled={isPending}
                className="rounded-lg px-3 py-2 text-xs font-medium" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                Descartar
              </button>
              <button onClick={handleSave} disabled={isPending}
                className="rounded-lg px-3 py-2 text-xs font-medium text-white" style={{ backgroundColor: 'var(--color-coach)' }}>
                {isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
