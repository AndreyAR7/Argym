import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Users, CalendarDays, Dumbbell, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Mi Panel' }

const TYPE_LABEL: Record<string, string> = {
  in_person: 'Presencial',
  virtual:   'Virtual',
  phone:     'Teléfono',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default async function CoachHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const tomorrow   = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0)
  const nextWeek   = new Date(Date.now() + 7 * 86_400_000)

  const [
    { count: pendingAppointments },
    { count: upcomingCount },
    { count: routineCount },
    { count: clientCount },
    { data: todayAppointments },
    { data: recentClients },
    { data: upcomingAppointments },
  ] = await Promise.all([
    // stat: pending (status = scheduled)
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user!.id)
      .eq('status', 'scheduled'),

    // stat: upcoming (any future appointment)
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user!.id)
      .gte('start_time', new Date().toISOString()),

    // stat: routines created
    supabase
      .from('routines')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user!.id),

    // stat: assigned clients
    supabase
      .from('coach_client_assignments')
      .select('client_id', { count: 'exact', head: true })
      .eq('coach_id', user!.id),

    // today's schedule — full detail
    supabase
      .from('appointments')
      .select('id, title, start_time, end_time, status, appointment_type, client:profiles!appointments_client_id_fkey(full_name, avatar_url)')
      .eq('coach_id', user!.id)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .order('start_time', { ascending: true }),

    // recent clients (last 5 assigned)
    supabase
      .from('coach_client_assignments')
      .select('client_id, created_at, profiles!coach_client_assignments_client_id_fkey(id, full_name, avatar_url, client_level, is_active)')
      .eq('coach_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5),

    // upcoming appointments (next 7 days, beyond today)
    supabase
      .from('appointments')
      .select('id, title, start_time, status')
      .eq('coach_id', user!.id)
      .gte('start_time', tomorrow.toISOString())
      .lte('start_time', nextWeek.toISOString())
      .order('start_time', { ascending: true })
      .limit(5),
  ])

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title={`Hola, ${profile?.full_name?.split(' ')[0] ?? 'Coach'}`}
        subtitle="Aquí está el resumen de tu actividad"
      />

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Citas pendientes"
          value={pendingAppointments ?? 0}
          icon={<CalendarDays size={18} />}
          accentClass="text-[var(--color-coach)]"
          href="/coach/appointments"
        />
        <StatCard
          label="Próximas citas"
          value={upcomingCount ?? 0}
          icon={<CalendarDays size={18} />}
          accentClass="text-[var(--color-client)]"
          href="/coach/appointments"
        />
        <StatCard
          label="Rutinas creadas"
          value={routineCount ?? 0}
          icon={<Dumbbell size={18} />}
          accentClass="text-[var(--color-admin)]"
          href="/coach/routines"
        />
        <StatCard
          label="Clientes asignados"
          value={clientCount ?? 0}
          icon={<Users size={18} />}
          accentClass="text-[var(--color-coach)]"
          href="/coach/clients"
        />
      </div>

      {/* ── Two-column: today + upcoming ────────────────────── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left — Agenda de hoy */}
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Agenda de hoy</p>
            <Link
              href="/coach/appointments"
              className="text-xs text-[var(--color-coach)] hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {!todayAppointments || todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-5 gap-2">
              <span className="text-2xl">🎉</span>
              <p className="text-sm text-[var(--color-muted-foreground)] text-center">
                Sin citas programadas para hoy
              </p>
            </div>
          ) : (
            <ul className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
              {(todayAppointments as any[]).map((apt) => {
                const client = apt.client as { full_name: string; avatar_url: string | null } | null
                const statusVariant = apt.status as string

                return (
                  <li key={apt.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--color-muted)] transition-colors">
                    {/* Time column */}
                    <div className="flex-shrink-0 w-[72px] text-right">
                      <p className="text-xs font-semibold text-[var(--color-foreground)]">
                        {formatTime(apt.start_time)}
                      </p>
                      {apt.end_time && (
                        <p className="text-[10px] text-[var(--color-muted-foreground)]">
                          {formatTime(apt.end_time)}
                        </p>
                      )}
                    </div>

                    {/* Divider dot */}
                    <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-coach)]" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                        {apt.title}
                      </p>
                      {client && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Avatar
                            name={client.full_name}
                            src={client.avatar_url}
                            size="sm"
                            className="w-4 h-4 bg-[var(--color-client-light)]"
                          />
                          <span className="text-xs text-[var(--color-muted-foreground)] truncate">
                            {client.full_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      {apt.appointment_type && (
                        <span className="text-[10px] text-[var(--color-muted-foreground)]">
                          {TYPE_LABEL[apt.appointment_type] ?? apt.appointment_type}
                        </span>
                      )}
                      <Badge value={statusVariant} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Right — Próximas citas */}
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Próximas citas</p>
            <Link
              href="/coach/appointments"
              className="text-xs text-[var(--color-coach)] hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {!upcomingAppointments || upcomingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-5 gap-2">
              <CalendarDays size={28} className="text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-muted-foreground)] text-center">
                Sin citas en los próximos 7 días
              </p>
            </div>
          ) : (
            <ul className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
              {(upcomingAppointments as any[]).map((apt) => (
                <li key={apt.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--color-muted)] transition-colors">
                  <div className="flex-shrink-0 text-center min-w-[52px]">
                    <p className="text-[10px] uppercase font-semibold text-[var(--color-coach)] tracking-wide">
                      {new Date(apt.start_time).toLocaleDateString('es-CR', { weekday: 'short' })}
                    </p>
                    <p className="text-base font-bold text-[var(--color-foreground)] leading-tight">
                      {new Date(apt.start_time).getDate()}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      {new Date(apt.start_time).toLocaleDateString('es-CR', { month: 'short' })}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                      {apt.title}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {formatTime(apt.start_time)}
                    </p>
                  </div>

                  <Badge value={apt.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Recent clients ───────────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Mis clientes recientes</p>
          <Link
            href="/coach/clients"
            className="text-xs text-[var(--color-coach)] hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {!recentClients || recentClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-5 gap-2 bg-[var(--color-card)]">
            <Users size={28} className="text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Aún no tienes clientes asignados
            </p>
          </div>
        ) : (
          <div className="bg-[var(--color-card)] px-5 py-4">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {(recentClients as any[]).map((row) => {
                const p = row.profiles as {
                  id: string
                  full_name: string
                  avatar_url: string | null
                  client_level: string | null
                  is_active: boolean | null
                } | null

                if (!p) return null

                return (
                  <Link
                    key={p.id}
                    href={`/coach/clients/${p.id}`}
                    className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-coach)] hover:bg-[var(--color-coach-light)] transition-all w-[110px] group"
                  >
                    <Avatar
                      name={p.full_name ?? '?'}
                      src={p.avatar_url}
                      size="lg"
                      className="bg-[var(--color-client-light)]"
                    />
                    <p className="text-xs font-medium text-[var(--color-foreground)] text-center leading-tight line-clamp-2 group-hover:text-[var(--color-coach)]">
                      {p.full_name ?? '—'}
                    </p>
                    {p.client_level && (
                      <Badge value={p.client_level} />
                    )}
                  </Link>
                )
              })}

              {/* "Ver todos" card */}
              <Link
                href="/coach/clients"
                className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-coach)] hover:bg-[var(--color-coach-light)] transition-all w-[110px] text-[var(--color-muted-foreground)] hover:text-[var(--color-coach)]"
              >
                <ChevronRight size={20} />
                <span className="text-xs font-medium">Ver todos</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
