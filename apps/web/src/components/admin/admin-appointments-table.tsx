'use client'

import { useState } from 'react'
import { CalendarDays, MapPin, Video, Phone } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { AppointmentStatusSelect } from '@/components/admin/appointment-status-select'
import AppointmentEditModal, { type AppointmentForEdit } from '@/components/admin/appointment-edit-modal'

interface Participant { id: string; full_name: string; avatar_url: string | null }

interface Appointment extends AppointmentForEdit {
  client_avatar: string | null
  client:  { full_name: string; avatar_url: string | null } | null
  coach:   { full_name: string } | null
  participants: Participant[]
}

interface Coach  { id: string; full_name: string }
interface Client { id: string; full_name: string }

interface Props {
  appointments: Appointment[]
  coaches:      Coach[]
  clients:      Client[]
  statusFilter: string
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  in_person: <MapPin size={12} />,
  virtual:   <Video  size={12} />,
  phone:     <Phone  size={12} />,
}

const TYPE_LABELS: Record<string, string> = {
  in_person: 'Presencial',
  virtual:   'Virtual',
  phone:     'Teléfono',
}

function formatDateTime(iso: string) {
  const d    = new Date(iso)
  const date = new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit' }).format(d)
  return { date, time }
}

export function AdminAppointmentsTable({ appointments, coaches, clients, statusFilter }: Props) {
  const [editing, setEditing] = useState<Appointment | null>(null)

  if (appointments.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center">
          <CalendarDays size={24} className="text-[var(--color-border)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">No hay citas</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {statusFilter !== 'all' ? 'No hay citas con este estado.' : 'Crea la primera cita con el botón de arriba.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Cita</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Clientes</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Coach</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {appointments.map((apt) => {
              const { date, time } = formatDateTime(apt.start_time)
              const displayClients: Array<{ full_name: string; avatar_url: string | null }> =
                apt.group_mode === 'group' && apt.participants.length > 0
                  ? apt.participants.map(p => ({ full_name: p.full_name, avatar_url: p.avatar_url }))
                  : apt.client ? [{ full_name: apt.client.full_name, avatar_url: apt.client.avatar_url }] : []

              return (
                <tr
                  key={apt.id}
                  onClick={() => setEditing(apt)}
                  className="hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
                  style={apt.status === 'postpone_requested'
                    ? { backgroundColor: 'color-mix(in srgb, #f59e0b 6%, transparent)' }
                    : undefined}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-foreground)] line-clamp-1">{apt.title}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 tabular-nums">{date} · {time}</p>
                  </td>
                  <td className="px-4 py-3">
                    {displayClients.length === 0 ? (
                      <span className="text-sm text-[var(--color-muted-foreground)] italic">Sin cliente</span>
                    ) : displayClients.length === 1 ? (
                      <div className="flex items-center gap-2.5">
                        <Avatar name={displayClients[0].full_name} src={displayClients[0].avatar_url} size="sm" />
                        <span className="text-sm text-[var(--color-foreground)]">{displayClients[0].full_name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-2">
                          {displayClients.slice(0, 3).map((c, i) => (
                            <Avatar key={i} name={c.full_name} src={c.avatar_url} size="sm" />
                          ))}
                        </div>
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          {displayClients.length} clientes
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-[var(--color-muted-foreground)]">
                    {apt.coach?.full_name ?? <span className="italic">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                      {TYPE_ICONS[apt.appointment_type]}
                      {TYPE_LABELS[apt.appointment_type] ?? apt.appointment_type}
                    </div>
                  </td>
                  {/* Stop propagation so the status select doesn't open the edit modal */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <AppointmentStatusSelect appointmentId={apt.id} initialStatus={apt.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <AppointmentEditModal
          appointment={editing}
          coaches={coaches}
          clients={clients}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
