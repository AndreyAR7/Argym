import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import { CalendarDays, MapPin, Video, Phone } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Mis Citas' }

const STATUS_TABS = [
  { value: 'all',                  label: 'Todas'       },
  { value: 'pending_confirmation', label: 'Pendientes'  },
  { value: 'confirmed',            label: 'Confirmadas' },
  { value: 'completed',            label: 'Completadas' },
  { value: 'cancelled',            label: 'Canceladas'  },
]

const TYPE_ICON: Record<string, React.ReactNode> = {
  in_person: <MapPin size={13} />,
  virtual:   <Video  size={13} />,
  phone:     <Phone  size={13} />,
}

const TYPE_LABEL: Record<string, string> = {
  in_person: 'Presencial',
  virtual:   'Virtual',
  phone:     'Teléfono',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default async function CoachAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const statusFilter = params.status ?? 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('appointments')
    .select('id, title, start_time, end_time, status, appointment_type, location, meeting_url, notes, client_id', { count: 'exact' })
    .eq('coach_id', user!.id)
    .order('start_time', { ascending: false })

  if (statusFilter !== 'all') query = query.eq('status', statusFilter)

  const { data: appointments, count } = await query

  // Fetch client profiles for appointments
  const clientIds = [...new Set((appointments ?? []).map((a: any) => a.client_id).filter(Boolean))]
  const clientMap = new Map<string, { full_name: string; avatar_url: string | null }>()
  if (clientIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', clientIds)
    ;(profiles ?? []).forEach((p: any) => clientMap.set(p.id, p))
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Mis Citas" subtitle={`${count ?? 0} cita${count !== 1 ? 's' : ''}`} />

      {/* Status tabs */}
      <div className="mt-6 flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/coach/appointments' : `/coach/appointments?status=${tab.value}`}
            className={`px-3.5 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Cita</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {appointments && appointments.length > 0 ? (
              appointments.map((apt: any) => {
                const client = clientMap.get(apt.client_id)
                const { date, time } = formatDateTime(apt.start_time)
                return (
                  <tr key={apt.id} className="hover:bg-[var(--color-muted)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-foreground)]">{apt.title}</p>
                      {apt.notes && (
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-1">{apt.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {client ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={client.full_name} src={client.avatar_url} size="sm" className="bg-[var(--color-client-light)]" />
                          <span className="text-sm text-[var(--color-foreground)]">{client.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--color-foreground)] capitalize">{date}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{time}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                        {TYPE_ICON[apt.appointment_type]}
                        {TYPE_LABEL[apt.appointment_type] ?? apt.appointment_type}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={apt.status} />
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <CalendarDays size={32} className="text-[var(--color-border)]" />
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {statusFilter !== 'all' ? 'Sin citas con ese estado' : 'Aún no tienes citas programadas'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
