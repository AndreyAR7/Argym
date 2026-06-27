'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AppointmentDetailSheet, type AppointmentDetail } from './appointment-detail-sheet'

interface Appointment extends AppointmentDetail {}

interface Props {
  appointments: Appointment[]
  weekStart: string
}

const HOUR_START   = 6
const HOUR_END     = 22
const PX_PER_MIN   = 1.3
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * 60 * PX_PER_MIN

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'var(--color-client)',
  confirmed:  '#22c55e',
  completed:  'var(--color-muted-foreground)',
  cancelled:  'var(--color-destructive)',
  no_show:    '#f59e0b',
}


function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoToLocalDateStr(iso: string): string {
  const d = new Date(iso)
  return localDateStr(d)
}

function topForTime(iso: string): number {
  const d    = new Date(iso)
  const mins = d.getHours() * 60 + d.getMinutes()
  return Math.max(0, (mins - HOUR_START * 60) * PX_PER_MIN)
}

function heightForDuration(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(24, (ms / 60000) * PX_PER_MIN)
}

function nowTop(): number | null {
  const now = new Date()
  const h   = now.getHours(); const m = now.getMinutes()
  if (h < HOUR_START || h >= HOUR_END) return null
  return (h * 60 + m - HOUR_START * 60) * PX_PER_MIN
}

export function ClientAppointmentsCalendar({ appointments, weekStart }: Props) {
  const router = useRouter()
  const [selected, setSelected]         = useState<Appointment | null>(null)
  const [currentTopPx, setCurrentTopPx] = useState<number | null>(nowTop)

  useEffect(() => {
    const id = setInterval(() => setCurrentTopPx(nowTop()), 60_000)
    return () => clearInterval(id)
  }, [])

  const baseDate = new Date(`${weekStart}T00:00:00`)
  const days     = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate); d.setDate(baseDate.getDate() + i); return d
  })

  const todayStr = localDateStr(new Date())

  function prevWeek() {
    const d = new Date(baseDate); d.setDate(d.getDate() - 7)
    router.push(`?view=calendar&week=${localDateStr(d)}`)
  }
  function nextWeek() {
    const d = new Date(baseDate); d.setDate(d.getDate() + 7)
    router.push(`?view=calendar&week=${localDateStr(d)}`)
  }
  function goToday() { router.push('?view=calendar') }

  const aptsByDate: Record<string, Appointment[]> = {}
  for (const apt of appointments) {
    const k = isoToLocalDateStr(apt.start_time)
    if (!aptsByDate[k]) aptsByDate[k] = []
    aptsByDate[k].push(apt)
  }

  const weekEndDate = new Date(baseDate); weekEndDate.setDate(baseDate.getDate() + 6)
  const monthLabel  = new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric' }).format(baseDate)
  const rangeLabel  = `${baseDate.getDate()} – ${weekEndDate.getDate()} ${new Intl.DateTimeFormat('es-CR', { month: 'long' }).format(weekEndDate)}`

  return (
    <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-card)]">
      {/* Week header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-foreground)] capitalize">{monthLabel}</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">({rangeLabel})</span>
          {appointments.length > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: 'var(--color-client)' }}>
              {appointments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevWeek}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToday}
            className="px-2.5 py-1 text-xs font-medium rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] transition-colors">
            Hoy
          </button>
          <button onClick={nextWeek}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid border-b border-[var(--color-border)] sticky top-0 z-10 bg-[var(--color-card)]"
        style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
        <div className="border-r border-[var(--color-border)]" />
        {days.map((d, i) => {
          const isToday = localDateStr(d) === todayStr
          return (
            <div key={i} className="py-2 text-center border-r border-[var(--color-border)] last:border-r-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                {DAY_LABELS[i]}
              </p>
              <div
                className="mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold"
                style={isToday
                  ? { backgroundColor: 'var(--color-client)', color: 'white' }
                  : { color: 'var(--color-foreground)' }}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {appointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sin citas esta semana</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Tu coach agendará citas contigo pronto.</p>
        </div>
      )}

      {/* Scrollable grid */}
      <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
        <div className="grid relative" style={{ gridTemplateColumns: '44px repeat(7, 1fr)', height: `${TOTAL_HEIGHT}px` }}>
          {/* Time labels */}
          <div className="relative border-r border-[var(--color-border)]">
            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
              <div key={i} className="absolute right-1.5 text-[10px] tabular-nums text-[var(--color-muted-foreground)]"
                style={{ top: `${i * 60 * PX_PER_MIN - 6}px` }}>
                {String(HOUR_START + i).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const dateStr = localDateStr(d)
            const dayApts = aptsByDate[dateStr] ?? []
            const isToday = dateStr === todayStr

            return (
              <div key={di}
                className="relative border-r border-[var(--color-border)] last:border-r-0"
                style={isToday ? { backgroundColor: 'color-mix(in srgb, var(--color-client) 4%, transparent)' } : undefined}
              >
                {/* Hour grid lines */}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={`h${i}`} className="absolute inset-x-0 border-t border-[var(--color-border)]"
                    style={{ top: `${i * 60 * PX_PER_MIN}px` }} />
                ))}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={`hh${i}`} className="absolute inset-x-0 border-t border-dashed opacity-35 border-[var(--color-border)]"
                    style={{ top: `${(i * 60 + 30) * PX_PER_MIN}px` }} />
                ))}

                {/* Current time line — red */}
                {isToday && currentTopPx !== null && (
                  <div className="absolute inset-x-0 z-10 pointer-events-none flex items-center"
                    style={{ top: `${currentTopPx}px` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 -ml-1 bg-red-500" />
                    <div className="flex-1 border-t border-red-500" />
                  </div>
                )}

                {/* Appointment blocks */}
                {dayApts.map(apt => {
                  const top    = topForTime(apt.start_time)
                  const height = heightForDuration(apt.start_time, apt.end_time)
                  const color  = STATUS_COLORS[apt.status] ?? 'var(--color-client)'
                  const startD = new Date(apt.start_time)
                  const timeStr = `${String(startD.getHours()).padStart(2,'0')}:${String(startD.getMinutes()).padStart(2,'0')}`

                  return (
                    <div key={apt.id}
                      className="absolute overflow-hidden px-1 py-0.5 rounded cursor-pointer transition-all hover:brightness-95 hover:shadow-md"
                      style={{
                        top,
                        height:          `${height}px`,
                        left:            '1%',
                        width:           '98%',
                        backgroundColor: `color-mix(in srgb, ${color} 15%, white)`,
                        borderLeft:      `3px solid ${color}`,
                      }}
                      onClick={() => setSelected(apt)}
                    >
                      <p className="text-[10px] font-semibold truncate leading-tight" style={{ color }}>
                        {apt.title}
                      </p>
                      {height > 36 && (
                        <p className="text-[9px] truncate leading-tight opacity-80" style={{ color }}>
                          {timeStr}{apt.coach ? ` · ${apt.coach.full_name}` : ''}
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

      <AppointmentDetailSheet appointment={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
