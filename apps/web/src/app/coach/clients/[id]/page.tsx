import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Dumbbell, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { MeasurementsSummary } from '@/components/shared/measurements-summary'
import { RecordMeasurementButton } from './record-measurement-button'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Progreso del cliente' }

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
}

/** Returns ISO date string YYYY-MM-DD for a Date */
function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

/** Produces the last N calendar days as YYYY-MM-DD strings, newest last */
function lastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    days.push(isoDate(d))
  }
  return days
}

export default async function CoachClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: clientId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Verify this coach has this client assigned
  const { data: assignment } = await supabase
    .from('coach_client_assignments')
    .select('coach_id')
    .eq('coach_id', user.id)
    .eq('client_id', clientId)
    .maybeSingle()

  if (!assignment) notFound()

  const [
    profileResult,
    measurementsResult,
    appointmentsResult,
    routinesResult,
    progressResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, phone, client_level, is_active, approval_status, created_at')
      .eq('id', clientId)
      .single(),

    supabase
      .from('body_measurements')
      .select('measured_at, weight_kg, height_cm, body_fat_pct, waist_cm, abdomen_cm, hip_cm, arm_cm, thigh_cm, calf_cm, chest_cm, shoulder_cm, neck_cm')
      .eq('client_id', clientId)
      .order('measured_at', { ascending: false })
      .limit(12),

    // Recent appointments for this client (last 5)
    supabase
      .from('appointments')
      .select('id, title, start_time, status, appointment_type')
      .eq('client_id', clientId)
      .eq('coach_id', user.id)
      .order('start_time', { ascending: false })
      .limit(5),

    // Routine assignments
    supabase
      .from('routine_assignments')
      .select('id, assigned_at, routines(id, name, description)')
      .eq('client_id', clientId)
      .order('assigned_at', { ascending: false })
      .limit(5),

    // Exercise progress last 14 days
    supabase
      .from('exercise_progress')
      .select('session_date, completed')
      .eq('client_id', clientId)
      .gte('session_date', isoDate(new Date(Date.now() - 14 * 86_400_000)))
      .order('session_date', { ascending: false }),
  ])

  const profile = profileResult.data
  if (!profile) notFound()

  const measurements  = measurementsResult.data  ?? []
  const appointments  = appointmentsResult.data   ?? []
  const routineAssignments = routinesResult.data  ?? []
  const exerciseProgress   = progressResult.data  ?? []

  // Build a Set of dates that have at least one completed session
  const completedDates = new Set(
    exerciseProgress
      .filter((p: any) => p.completed)
      .map((p: any) => p.session_date as string),
  )
  const activeDates = new Set(
    exerciseProgress.map((p: any) => p.session_date as string),
  )
  const days14 = lastNDays(14)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        href="/coach/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Mis clientes
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Avatar
          name={profile.full_name ?? '?'}
          src={profile.avatar_url}
          size="lg"
          className="w-14 h-14 text-base flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <PageHeader
            title={profile.full_name ?? '—'}
            subtitle={`Miembro desde ${formatDate(profile.created_at)}`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge value={profile.is_active !== false ? 'active' : 'inactive'} showDot />
              {profile.client_level && (
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {LEVEL_LABELS[profile.client_level] ?? profile.client_level}
                </span>
              )}
              {profile.phone && (
                <span className="text-xs text-[var(--color-muted-foreground)]">{profile.phone}</span>
              )}
            </div>
          </PageHeader>
        </div>
      </div>

      <div className="space-y-6">
        {/* Measurements summary */}
        <MeasurementsSummary measurements={measurements} />

        {/* Record measurement */}
        <RecordMeasurementButton clientId={clientId} />

        {/* Recent appointments */}
        <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-[var(--color-muted-foreground)]" />
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Citas recientes</h3>
          </div>

          {appointments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] py-2">
              No hay citas registradas con este cliente.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {appointments.map((appt: any) => (
                <li key={appt.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                      {appt.title ?? appt.appointment_type ?? 'Cita'}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDate(appt.start_time)}
                    </p>
                  </div>
                  <Badge value={appt.status ?? 'default'} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Routine assignments */}
        <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell size={15} className="text-[var(--color-muted-foreground)]" />
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Rutinas asignadas</h3>
          </div>

          {routineAssignments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] py-2">
              No hay rutinas asignadas a este cliente.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {routineAssignments.map((ra: any) => {
                const routine = Array.isArray(ra.routines) ? ra.routines[0] : ra.routines
                return (
                  <li key={ra.id} className="flex items-start justify-between py-2.5 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                        {routine?.name ?? '—'}
                      </p>
                      {routine?.description && (
                        <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                          {routine.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-muted-foreground)] whitespace-nowrap flex-shrink-0">
                      {formatDate(ra.assigned_at)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Activity heatmap — last 14 days */}
        <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-[var(--color-muted-foreground)]" />
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
              Actividad reciente (14 días)
            </h3>
          </div>

          <div className="flex items-end gap-1.5 flex-wrap">
            {days14.map((day) => {
              const hasActivity = activeDates.has(day)
              const isComplete  = completedDates.has(day)
              return (
                <div key={day} className="flex flex-col items-center gap-1">
                  <div
                    title={`${day}${isComplete ? ' — ejercicios completados' : hasActivity ? ' — actividad registrada' : ' — sin actividad'}`}
                    className={`w-7 h-7 rounded-md transition-colors ${
                      isComplete
                        ? 'bg-emerald-500'
                        : hasActivity
                        ? 'bg-amber-400'
                        : 'bg-[var(--color-muted)] border border-[var(--color-border)]'
                    }`}
                  />
                  <span className="text-[9px] text-[var(--color-muted-foreground)] tabular-nums">
                    {new Date(day + 'T12:00:00').getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              Completado
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
              Parcial
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <span className="w-3 h-3 rounded bg-[var(--color-muted)] border border-[var(--color-border)] inline-block" />
              Sin actividad
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
