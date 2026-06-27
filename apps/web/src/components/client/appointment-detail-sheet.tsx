'use client'

import { useEffect } from 'react'
import { X, Clock, User, MapPin, Video, Phone, ExternalLink, Navigation, MonitorPlay } from 'lucide-react'

export interface AppointmentDetail {
  id: string
  title: string
  start_time: string
  end_time: string
  status: string
  appointment_type: string
  notes: string | null
  location: string | null
  meeting_url: string | null
  coach: { full_name: string } | null
}

interface Props {
  appointment: AppointmentDetail | null
  onClose: () => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Programada', color: 'var(--color-client)' },
  confirmed:  { label: 'Confirmada',  color: '#22c55e'                },
  completed:  { label: 'Completada',  color: 'var(--color-muted-foreground)' },
  cancelled:  { label: 'Cancelada',   color: 'var(--color-destructive)' },
  no_show:    { label: 'No asistió',  color: '#f59e0b'                },
}

const TYPE_CONFIG: Record<string, { label: string; Icon: React.FC<{ size?: number; style?: React.CSSProperties }> }> = {
  in_person: { label: 'Presencial', Icon: MapPin },
  virtual:   { label: 'Virtual',    Icon: Video  },
  phone:     { label: 'Teléfono',   Icon: Phone  },
}

export function AppointmentDetailSheet({ appointment, onClose }: Props) {
  useEffect(() => {
    if (!appointment) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [appointment, onClose])

  if (!appointment) return null

  const status   = STATUS_CONFIG[appointment.status] ?? { label: appointment.status, color: 'var(--color-muted-foreground)' }
  const typeConf = TYPE_CONFIG[appointment.appointment_type] ?? TYPE_CONFIG.in_person
  const TypeIcon = typeConf.Icon

  const startD   = new Date(appointment.start_time)
  const endD     = new Date(appointment.end_time)
  const dateStr  = startD.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr  = `${startD.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })} – ${endD.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`

  const gMapsUrl = appointment.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.location)}`
    : null
  const wazeUrl  = appointment.location
    ? `https://waze.com/ul?q=${encodeURIComponent(appointment.location)}&navigate=yes`
    : null

  const isVirtual   = appointment.appointment_type === 'virtual'
  const isInPerson  = appointment.appointment_type === 'in_person'
  const isPhone     = appointment.appointment_type === 'phone'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl"
        style={{ backgroundColor: 'var(--color-card)', borderTop: '1px solid var(--color-border)', maxWidth: 560, margin: '0 auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-3 pb-2">
          <div className="flex-1 min-w-0 pr-3">
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${status.color} 15%, transparent)`,
                color: status.color,
                border: `1px solid color-mix(in srgb, ${status.color} 35%, transparent)`,
              }}
            >
              {status.label}
            </span>
            <h2 className="text-base font-bold leading-snug" style={{ color: 'var(--color-foreground)' }}>
              {appointment.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Info rows */}
        <div className="px-5 pb-2 space-y-2">
          {/* Date / time */}
          <div
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: 'var(--color-muted)' }}
          >
            <Clock size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--color-client)' }} />
            <div>
              <p className="text-sm font-semibold capitalize" style={{ color: 'var(--color-foreground)' }}>{dateStr}</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{timeStr}</p>
            </div>
          </div>

          {/* Type + coach */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <TypeIcon size={14} style={{ color: 'var(--color-client)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>{typeConf.label}</span>
            </div>
            {appointment.coach && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: 'var(--color-muted)' }}
              >
                <User size={14} style={{ color: 'var(--color-client)' }} />
                <span className="text-xs font-medium truncate" style={{ color: 'var(--color-foreground)' }}>
                  {appointment.coach.full_name}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {appointment.notes && (
            <p
              className="text-xs italic px-3 py-2 rounded-xl"
              style={{ color: 'var(--color-muted-foreground)', backgroundColor: 'var(--color-muted)' }}
            >
              {appointment.notes}
            </p>
          )}
        </div>

        {/* Action area */}
        <div className="px-5 pt-1 pb-8 space-y-3">

          {/* ── VIRTUAL ── */}
          {isVirtual && appointment.meeting_url && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                Unirse a la reunión
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={appointment.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-client)', color: 'white' }}
                >
                  <ExternalLink size={14} />
                  Nueva pestaña
                </a>
                <a
                  href={appointment.meeting_url}
                  className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90 border-2"
                  style={{ color: 'var(--color-client)', borderColor: 'var(--color-client)', backgroundColor: 'transparent' }}
                >
                  <MonitorPlay size={14} />
                  Esta ventana
                </a>
              </div>
            </div>
          )}
          {isVirtual && !appointment.meeting_url && (
            <div
              className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <Video size={14} style={{ color: 'var(--color-muted-foreground)' }} />
              <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Enlace de reunión no disponible aún
              </span>
            </div>
          )}

          {/* ── TELÉFONO ── */}
          {isPhone && appointment.meeting_url && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                Número de contacto
              </p>
              <a
                href={`tel:${appointment.meeting_url}`}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border transition-opacity hover:opacity-80"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-client)' }}
              >
                <Phone size={15} />
                <span className="text-sm font-semibold">{appointment.meeting_url}</span>
              </a>
            </div>
          )}

          {/* ── PRESENCIAL ── */}
          {isInPerson && appointment.location && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                Cómo llegar · <span style={{ textTransform: 'none', fontWeight: 400 }}>{appointment.location}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={gMapsUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#4285F4', color: 'white' }}
                >
                  <Navigation size={14} />
                  Google Maps
                </a>
                <a
                  href={wazeUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#33CCFF', color: 'white' }}
                >
                  <Navigation size={14} />
                  Waze
                </a>
              </div>
            </div>
          )}
          {isInPerson && !appointment.location && (
            <div
              className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <MapPin size={14} style={{ color: 'var(--color-muted-foreground)' }} />
              <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Sin ubicación especificada
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
