'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, MapPin, Video, Phone, X, Clock, Users } from 'lucide-react'
import { AppointmentQuickForm } from '@/components/admin/appointment-quick-form'

interface Participant { id: string; full_name: string; avatar_url: string | null }

interface Appointment {
  id: string
  title: string
  start_time: string
  end_time: string
  status: string
  appointment_type: string
  group_mode: string
  client: { full_name: string; avatar_url: string | null } | null
  coach:  { full_name: string } | null
  participants: Participant[]
}

interface Client { id: string; full_name: string; client_level: string | null }
interface Coach  { id: string; full_name: string }

interface Props {
  appointments: Appointment[]
  coaches:      Coach[]
  clients:      Client[]
  weekStart:    string
}

const HOUR_START  = 6
const HOUR_END    = 22
const PX_PER_MIN  = 1.3
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * 60 * PX_PER_MIN

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  in_person: { bg: 'color-mix(in srgb, var(--color-admin) 14%, white)',  border: 'var(--color-admin)',  text: 'var(--color-admin)'  },
  virtual:   { bg: 'color-mix(in srgb, var(--color-coach) 14%, white)',  border: 'var(--color-coach)',  text: 'var(--color-coach)'  },
  phone:     { bg: 'color-mix(in srgb, var(--color-client) 14%, white)', border: 'var(--color-client)', text: 'var(--color-client)' },
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  in_person: <MapPin size={10} />,
  virtual:   <Video  size={10} />,
  phone:     <Phone  size={10} />,
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function topForTime(iso: string): number {
  const d    = new Date(iso)
  const mins = d.getHours() * 60 + d.getMinutes()
  return Math.max(0, (mins - HOUR_START * 60) * PX_PER_MIN)
}

function heightForDuration(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(24, (ms / 60000) * PX_PER_MIN)
}

function isoToLocalDateStr(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nowTop(): number | null {
  const now = new Date()
  const h = now.getHours(); const m = now.getMinutes()
  if (h < HOUR_START || h >= HOUR_END) return null
  return (h * 60 + m - HOUR_START * 60) * PX_PER_MIN
}

interface SlotClick  { date: string; time: string }
interface AptTooltip { apt: Appointment; x: number; y: number }

export function AppointmentsCalendar({ appointments, coaches, clients, weekStart }: Props) {
  const router = useRouter()
  const [slotClick, setSlotClick] = useState<SlotClick  | null>(null)
  const [tooltip,   setTooltip]   = useState<AptTooltip | null>(null)
  const [currentTopPx, setCurrentTopPx] = useState<number | null>(nowTop)

  // Update current-time line every minute
  useEffect(() => {
    const id = setInterval(() => setCurrentTopPx(nowTop()), 60_000)
    return () => clearInterval(id)
  }, [])

  const baseDate = new Date(`${weekStart}T00:00:00`)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate); d.setDate(baseDate.getDate() + i); return d
  })

  const todayStr = isoToLocalDateStr(new Date().toISOString())

  function localDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function prevWeek() { const d = new Date(baseDate); d.setDate(d.getDate() - 7); router.push(`?view=calendar&week=${localDateStr(d)}`) }
  function nextWeek() { const d = new Date(baseDate); d.setDate(d.getDate() + 7); router.push(`?view=calendar&week=${localDateStr(d)}`) }

  const aptsByDate: Record<string, Appointment[]> = {}
  for (const apt of appointments) {
    const k = isoToLocalDateStr(apt.start_time)
    if (!aptsByDate[k]) aptsByDate[k] = []
    aptsByDate[k].push(apt)
  }

  const monthLabel    = new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric' }).format(baseDate)
  const weekEndDate   = new Date(baseDate); weekEndDate.setDate(baseDate.getDate() + 6)
  const weekRangeLabel = `${baseDate.getDate()} – ${weekEndDate.getDate()} ${new Intl.DateTimeFormat('es-CR', { month: 'long' }).format(weekEndDate)}`

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dateStr: string) {
    if ((e.target as HTMLElement).closest('[data-apt]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y    = e.clientY - rect.top
    if (y < 0 || y > TOTAL_HEIGHT) return
    setTooltip(null)
    const mins  = Math.floor(y / PX_PER_MIN) + HOUR_START * 60
    const h     = Math.min(Math.floor(mins / 60), HOUR_END - 1)
    const m     = Math.floor((mins % 60) / 30) * 30
    const time  = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setSlotClick({ date: dateStr, time })
  }

  // Overlap: group appointments on same day that overlap in time
  function layoutDay(dayApts: Appointment[]) {
    // Sort by start time
    const sorted = [...dayApts].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    const columns: Appointment[][] = []
    for (const apt of sorted) {
      const aptStart = new Date(apt.start_time).getTime()
      const aptEnd   = new Date(apt.end_time).getTime()
      let placed = false
      for (const col of columns) {
        const lastEnd = new Date(col[col.length - 1].end_time).getTime()
        if (aptStart >= lastEnd) { col.push(apt); placed = true; break }
      }
      if (!placed) columns.push([apt])
    }
    // Assign column index and total columns to each apt
    const result = new Map<string, { col: number; totalCols: number }>()
    for (let ci = 0; ci < columns.length; ci++) {
      for (const apt of columns[ci]) {
        const aptStart = new Date(apt.start_time).getTime()
        const aptEnd   = new Date(apt.end_time).getTime()
        let total = columns.reduce((acc, c) =>
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

  return (
    <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-card)]">
      {/* Week header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-foreground)] capitalize">{monthLabel}</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">({weekRangeLabel})</span>
          {appointments.length > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
              {appointments.length}
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
              <div className={`mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${isToday ? '' : ''}`}
                style={isToday ? { backgroundColor: 'var(--color-admin)', color: 'white' } : { color: 'var(--color-foreground)' }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {appointments.length === 0 && (
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
            const layout  = layoutDay(dayApts)

            return (
              <div key={di}
                className="relative border-r border-[var(--color-border)] last:border-r-0 cursor-crosshair"
                style={isToday ? { backgroundColor: 'color-mix(in srgb, var(--color-admin) 3%, transparent)' } : undefined}
                onClick={e => handleColumnClick(e, dateStr)}
              >
                {/* Hour grid lines */}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={`h${i}`} className="absolute inset-x-0 border-t" style={{ top: `${i * 60 * PX_PER_MIN}px`, borderColor: 'var(--color-border)' }} />
                ))}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={`hh${i}`} className="absolute inset-x-0 border-t border-dashed opacity-35"
                    style={{ top: `${(i * 60 + 30) * PX_PER_MIN}px`, borderColor: 'var(--color-border)' }} />
                ))}

                {/* Current time red line — only on today's column */}
                {isToday && currentTopPx !== null && (
                  <div className="absolute inset-x-0 z-10 pointer-events-none flex items-center" style={{ top: `${currentTopPx}px` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 -ml-1" style={{ backgroundColor: '#ef4444' }} />
                    <div className="flex-1 h-px" style={{ backgroundColor: '#ef4444' }} />
                  </div>
                )}

                {/* Appointment blocks */}
                {dayApts.map(apt => {
                  const top    = topForTime(apt.start_time)
                  const height = heightForDuration(apt.start_time, apt.end_time)
                  const colors = TYPE_COLORS[apt.appointment_type] ?? TYPE_COLORS.in_person
                  const lInfo  = layout.get(apt.id) ?? { col: 0, totalCols: 1 }
                  const width  = 100 / lInfo.totalCols
                  const left   = width * lInfo.col

                  const startD   = new Date(apt.start_time)
                  const timeStr  = `${String(startD.getHours()).padStart(2,'0')}:${String(startD.getMinutes()).padStart(2,'0')}`
                  const isGroup  = apt.group_mode === 'group' && apt.participants.length > 0
                  const nameStr  = isGroup
                    ? `${apt.participants.length} clientes`
                    : (apt.client?.full_name ?? '—')

                  return (
                    <div key={apt.id} data-apt="1"
                      className="absolute overflow-hidden px-1 py-0.5 rounded cursor-pointer transition-all hover:brightness-95 hover:shadow-md"
                      style={{
                        top:         `${top}px`,
                        height:      `${height}px`,
                        left:        `${left + 0.5}%`,
                        width:       `${width - 1}%`,
                        backgroundColor: colors.bg,
                        borderLeft:  `3px solid ${colors.border}`,
                      }}
                      onClick={e => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setSlotClick(null)
                        setTooltip({ apt, x: rect.right + 8, y: rect.top })
                      }}
                    >
                      <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: colors.text }}>{apt.title}</p>
                      {height > 36 && (
                        <p className="text-[9px] truncate leading-tight opacity-80" style={{ color: colors.text }}>
                          {timeStr} · {nameStr}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Appointment tooltip */}
      {tooltip && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTooltip(null)} />
          <div
            className="fixed z-50 w-64 rounded-xl border shadow-xl p-4"
            style={{
              top:             `${Math.min(tooltip.y, window.innerHeight - 280)}px`,
              left:            `${Math.min(tooltip.x, window.innerWidth - 280)}px`,
              backgroundColor: 'var(--color-card)',
              borderColor:     'var(--color-border)',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-full min-h-[16px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: (TYPE_COLORS[tooltip.apt.appointment_type] ?? TYPE_COLORS.in_person).border }} />
                <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-foreground)' }}>{tooltip.apt.title}</p>
              </div>
              <button onClick={() => setTooltip(null)} className="shrink-0 hover:opacity-70" style={{ color: 'var(--color-muted-foreground)' }}>
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {/* Time */}
              <div className="flex items-center gap-1.5">
                <Clock size={11} />
                {new Date(tooltip.apt.start_time).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                {' — '}
                {new Date(tooltip.apt.end_time).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
              </div>

              {/* Clients */}
              {tooltip.apt.group_mode === 'group' && tooltip.apt.participants.length > 0 ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users size={11} />
                    <span className="font-medium">{tooltip.apt.participants.length} clientes</span>
                  </div>
                  <div className="pl-4 space-y-0.5">
                    {tooltip.apt.participants.slice(0, 5).map(p => (
                      <p key={p.id} className="truncate">{p.full_name}</p>
                    ))}
                    {tooltip.apt.participants.length > 5 && (
                      <p>+{tooltip.apt.participants.length - 5} más</p>
                    )}
                  </div>
                </div>
              ) : tooltip.apt.client ? (
                <div className="flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  {tooltip.apt.client.full_name}
                </div>
              ) : null}

              {/* Type */}
              <div className="flex items-center gap-1.5">
                {TYPE_ICON[tooltip.apt.appointment_type]}
                {tooltip.apt.appointment_type === 'in_person' ? 'Presencial'
                  : tooltip.apt.appointment_type === 'virtual' ? 'Virtual' : 'Teléfono'}
              </div>

              {/* Coach */}
              {tooltip.apt.coach && (
                <div className="flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Coach: {tooltip.apt.coach.full_name}
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor:
                    tooltip.apt.status === 'confirmed' ? 'var(--color-coach)' :
                    tooltip.apt.status === 'cancelled' ? 'var(--color-destructive)' :
                    tooltip.apt.status === 'completed' ? 'var(--color-muted-foreground)' :
                    'var(--color-admin)'
                  }} />
                {tooltip.apt.status === 'scheduled'  ? 'Programada'  :
                 tooltip.apt.status === 'confirmed'  ? 'Confirmada'  :
                 tooltip.apt.status === 'completed'  ? 'Completada'  :
                 tooltip.apt.status === 'cancelled'  ? 'Cancelada'   :
                 tooltip.apt.status === 'no_show'    ? 'No asistió'  : tooltip.apt.status}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick form (calendar click) */}
      {slotClick && (
        <AppointmentQuickForm
          date={slotClick.date}
          startTime={slotClick.time}
          coaches={coaches}
          clients={clients}
          onClose={() => setSlotClick(null)}
        />
      )}
    </div>
  )
}
