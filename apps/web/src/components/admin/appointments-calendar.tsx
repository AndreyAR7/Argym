'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, MapPin, Video, Phone, X, User, Clock } from 'lucide-react'
import { AppointmentQuickForm } from '@/components/admin/appointment-quick-form'

interface Appointment {
  id: string
  title: string
  start_time: string
  end_time: string
  status: string
  appointment_type: string
  client: { full_name: string; avatar_url: string | null } | null
  coach: { full_name: string } | null
}

interface Client {
  id: string
  full_name: string
  client_level: string | null
}

interface Coach {
  id: string
  full_name: string
}

interface Props {
  appointments: Appointment[]
  coaches: Coach[]
  clients: Client[]
  weekStart: string
}

const HOUR_START = 6
const HOUR_END = 22
const PX_PER_MIN = 1.2
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * 60 * PX_PER_MIN

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  in_person: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  virtual:   { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  phone:     { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  in_person: <MapPin size={10} />,
  virtual:   <Video size={10} />,
  phone:     <Phone size={10} />,
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function topForTime(iso: string): number {
  const d = new Date(iso)
  const mins = d.getHours() * 60 + d.getMinutes()
  return (mins - HOUR_START * 60) * PX_PER_MIN
}

function heightForDuration(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.max(28, ((e - s) / 60000) * PX_PER_MIN)
}

function isoToDateStr(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function timeFromClickY(y: number): string {
  const mins = Math.floor(y / PX_PER_MIN) + HOUR_START * 60
  const h = Math.min(Math.floor(mins / 60), HOUR_END - 1)
  const m = Math.floor((mins % 60) / 30) * 30
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

interface SlotClick { date: string; time: string }
interface AptTooltip { apt: Appointment; rectTop: number; rectRight: number }

export function AppointmentsCalendar({ appointments, coaches, clients, weekStart }: Props) {
  const router = useRouter()
  const [slotClick, setSlotClick] = useState<SlotClick | null>(null)
  const [tooltip, setTooltip] = useState<AptTooltip | null>(null)

  // Parse weekStart as local date (appending T00:00:00 avoids UTC-midnight shift)
  const baseDate = new Date(`${weekStart}T00:00:00`)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate)
    d.setDate(baseDate.getDate() + i)
    return d
  })
  // Today in local time
  const todayD = new Date()
  const today = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`

  function localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function prevWeek() {
    const d = new Date(baseDate); d.setDate(d.getDate() - 7)
    router.push(`?view=calendar&week=${localDateStr(d)}`)
  }
  function nextWeek() {
    const d = new Date(baseDate); d.setDate(d.getDate() + 7)
    router.push(`?view=calendar&week=${localDateStr(d)}`)
  }

  const aptsByDate: Record<string, Appointment[]> = {}
  for (const apt of appointments) {
    const k = isoToDateStr(apt.start_time)
    if (!aptsByDate[k]) aptsByDate[k] = []
    aptsByDate[k].push(apt)
  }

  const monthLabel = new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric' }).format(baseDate)
  const weekEndDate = new Date(baseDate); weekEndDate.setDate(baseDate.getDate() + 6)
  const weekRangeLabel = `${baseDate.getDate()} – ${weekEndDate.getDate()} ${new Intl.DateTimeFormat('es-CR', { month: 'long' }).format(weekEndDate)}`

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, dateStr: string) {
    if ((e.target as HTMLElement).closest('[data-apt]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    if (y < 0 || y > TOTAL_HEIGHT) return
    setTooltip(null)
    setSlotClick({ date: dateStr, time: timeFromClickY(y) })
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-card)]">
      {/* Week header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-foreground)] capitalize">{monthLabel}</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">({weekRangeLabel})</span>
          {appointments.length > 0 && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-admin)', color: 'white' }}>
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
      <div className="grid border-b border-[var(--color-border)]" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
        <div className="border-r border-[var(--color-border)]" />
        {days.map((d, i) => {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const isToday = dateStr === today
          return (
            <div key={i} className="py-2 text-center border-r border-[var(--color-border)] last:border-r-0">
              <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">{DAY_LABELS[i]}</p>
              <div className={`mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-[var(--color-admin)] text-white' : 'text-[var(--color-foreground)]'}`}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {appointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center border-b border-[var(--color-border)]">
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sin citas esta semana</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Haz clic en cualquier celda del calendario para crear una cita.</p>
        </div>
      )}

      {/* Scrollable grid */}
      <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
        <div className="grid relative" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', height: `${TOTAL_HEIGHT}px` }}>
          {/* Time labels */}
          <div className="relative border-r border-[var(--color-border)]">
            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
              <div key={i} className="absolute right-2 text-[10px] font-medium text-[var(--color-muted-foreground)] tabular-nums"
                style={{ top: `${i * 60 * PX_PER_MIN - 5}px` }}>
                {String(HOUR_START + i).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const dayApts = aptsByDate[dateStr] ?? []
            const isToday = dateStr === today

            return (
              <div key={di}
                className="relative border-r border-[var(--color-border)] last:border-r-0 cursor-crosshair"
                style={{ backgroundColor: isToday ? 'color-mix(in srgb, var(--color-admin) 4%, transparent)' : undefined }}
                onClick={(e) => handleColumnClick(e, dateStr)}
              >
                {/* Hour lines */}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={`h${i}`} className="absolute inset-x-0 border-t border-[var(--color-border)]" style={{ top: `${i * 60 * PX_PER_MIN}px` }} />
                ))}
                {/* Half-hour dashed */}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={`hh${i}`} className="absolute inset-x-0 border-t border-dashed border-[var(--color-border)] opacity-40"
                    style={{ top: `${(i * 60 + 30) * PX_PER_MIN}px` }} />
                ))}

                {/* Appointment blocks */}
                {dayApts.map((apt) => {
                  const top = topForTime(apt.start_time)
                  const height = heightForDuration(apt.start_time, apt.end_time)
                  const colors = TYPE_COLORS[apt.appointment_type] ?? TYPE_COLORS.in_person
                  const startD = new Date(apt.start_time)
                  const timeStr = `${String(startD.getHours()).padStart(2,'0')}:${String(startD.getMinutes()).padStart(2,'0')}`

                  return (
                    <div key={apt.id} data-apt="1"
                      className="absolute left-0.5 right-0.5 rounded overflow-hidden px-1.5 py-0.5 cursor-pointer hover:brightness-95 transition-all"
                      style={{ top: `${top}px`, height: `${height}px`, backgroundColor: colors.bg, borderLeft: `3px solid ${colors.border}` }}
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setSlotClick(null)
                        setTooltip({ apt, rectTop: rect.top, rectRight: rect.right })
                      }}
                    >
                      <p className="text-[10px] font-semibold truncate leading-tight" style={{ color: colors.text }}>{apt.title}</p>
                      {height > 40 && (
                        <p className="text-[9px] truncate opacity-80 leading-tight" style={{ color: colors.text }}>
                          {timeStr} · {apt.client?.full_name ?? '—'}
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

      {/* Tooltip on appointment click */}
      {tooltip && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTooltip(null)} />
          <div className="fixed z-50 w-60 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl p-4"
            style={{
              top: `${Math.max(8, tooltip.rectTop)}px`,
              left: `${tooltip.rectRight + 8}px`,
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-[var(--color-foreground)] leading-snug">{tooltip.apt.title}</p>
              <button onClick={() => setTooltip(null)} className="shrink-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-[var(--color-muted-foreground)]">
              <div className="flex items-center gap-1.5"><User size={11} />{tooltip.apt.client?.full_name ?? 'Sin cliente'}</div>
              <div className="flex items-center gap-1.5">
                <Clock size={11} />
                {new Date(tooltip.apt.start_time).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                {' — '}
                {new Date(tooltip.apt.end_time).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-center gap-1.5">
                {TYPE_ICON[tooltip.apt.appointment_type] ?? null}
                {tooltip.apt.appointment_type === 'in_person' ? 'Presencial'
                  : tooltip.apt.appointment_type === 'virtual' ? 'Virtual' : 'Teléfono'}
              </div>
              {tooltip.apt.coach && <div>Coach: {tooltip.apt.coach.full_name}</div>}
            </div>
          </div>
        </>
      )}

      {/* Quick form to create appointment */}
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
