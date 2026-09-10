import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { ClassTemplateCard } from '@/components/admin/class-template-card'
import { NewClassTemplateButton } from '@/components/admin/new-class-template-button'
import { AdminAppointmentsGuestTable } from '@/components/admin/admin-appointments-guest-table'
import { AppointmentListFilters } from '@/components/admin/appointment-list-filters'
import { CalendarRange } from 'lucide-react'

export const metadata = { title: 'Clases' }

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; coach?: string }>
}) {
  const params = await searchParams
  const tab = params.tab === 'templates' ? 'templates' : 'scheduled'
  const coachFilter = params.coach ?? 'all'

  const todayStr       = localDateStr(new Date())
  const isDefaultRange = !params.from && !params.to
  const fromFilter      = params.from ?? todayStr
  const toFilter        = params.to   ?? (params.from ?? todayStr)

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const [{ data: branches }, { data: coaches }, { data: tenant }, { data: templates }, listResult, { data: clientProfiles }] = await Promise.all([
    supabase.from('branches').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).order('name'),
    supabase.rpc('get_profiles_by_role', { role_name: 'coach' }),
    supabase.from('tenants').select('default_class_capacity, appointment_grace_hours').eq('id', tenantId).single(),
    supabase
      .from('class_templates')
      .select('id, name, branch_id, coach_id, day_of_week, start_time, end_time, max_participants, is_active, grace_hours_override')
      .eq('tenant_id', tenantId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
    // Every class — template-generated or ad-hoc "Nueva clase" — is a real
    // appointments row with group_mode='group'; this is the same
    // list_appointments()+guest-table combo the appointments pages use, just
    // filtered down to classes only.
    supabase.rpc('list_appointments'),
    supabase.rpc('get_profiles_by_role', { role_name: 'client' }),
  ])

  const branchList = branches ?? []
  const coachList = coaches ?? []
  const clientList = clientProfiles ?? []
  const defaultCapacity = tenant?.default_class_capacity ?? 12
  const tenantGraceHours = tenant?.appointment_grace_hours ?? 2
  const activeTemplates = (templates ?? []).filter((t) => t.is_active)
  const inactiveTemplates = (templates ?? []).filter((t) => !t.is_active)

  const rawApts = (listResult.data ?? []) as Array<{
    id: string; title: string; description: string | null
    start_time: string; end_time: string; status: string
    appointment_type: string; location: string | null; meeting_url: string | null
    group_mode: string; coach_id: string | null; coach_name: string | null
    client_id: string | null; client_name: string | null; client_avatar: string | null
    series_id: string | null; class_template_id: string | null; max_participants: number | null
    participants: Array<{ id: string; full_name: string; avatar_url: string | null; status?: string; participant_id?: string }>
    cancellation_reason: string | null
  }>
  const classApts = rawApts
    .filter(a => a.group_mode === 'group')
    .map(a => ({
      ...a,
      client: a.client_id ? { full_name: a.client_name ?? '', avatar_url: a.client_avatar ?? null } : null,
      coach:  a.coach_id  ? { full_name: a.coach_name  ?? '' }                                       : null,
    }))

  let filteredClasses = classApts.filter(a => {
    const d = localDateStr(new Date(a.start_time))
    return d >= fromFilter && d <= toFilter
  })
  if (coachFilter !== 'all') filteredClasses = filteredClasses.filter(a => a.coach_id === coachFilter)
  filteredClasses.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Preserves the scheduled tab's date-range/coach filters when bouncing
  // over to "Horarios recurrentes" and back — a literal href here would
  // silently reset them to "today" on the way back.
  function tabUrl(t: string) {
    const sp = new URLSearchParams()
    if (t === 'templates') sp.set('tab', 'templates')
    else {
      if (!isDefaultRange) { sp.set('from', fromFilter); sp.set('to', toFilter) }
      if (coachFilter !== 'all') sp.set('coach', coachFilter)
    }
    const qs = sp.toString()
    return `/admin/clases${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Clases"
        subtitle={tab === 'scheduled'
          ? `${filteredClasses.length} clase${filteredClasses.length !== 1 ? 's' : ''}${isDefaultRange ? ' hoy' : ''}`
          : `${activeTemplates.length} plantilla${activeTemplates.length !== 1 ? 's' : ''} activa${activeTemplates.length !== 1 ? 's' : ''}`}
      >
        {tab === 'templates' && (
          <NewClassTemplateButton branches={branchList} coaches={coachList} defaultCapacity={defaultCapacity} />
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-0 rounded-lg border border-[var(--color-border)] overflow-hidden w-fit">
        <Link href={tabUrl('scheduled')}
          className={`px-3.5 py-2 text-sm font-medium transition-colors ${
            tab === 'scheduled' ? 'bg-[var(--color-admin)] text-white' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
          }`}
        >
          Clases programadas
        </Link>
        <Link href={tabUrl('templates')}
          className={`px-3.5 py-2 text-sm font-medium transition-colors ${
            tab === 'templates' ? 'bg-[var(--color-admin)] text-white' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
          }`}
        >
          Horarios recurrentes
        </Link>
      </div>

      {tab === 'scheduled' ? (
        <>
          <div className="mt-4">
            <AppointmentListFilters
              defaultFrom={fromFilter}
              defaultTo={toFilter}
              defaultCoach={coachFilter}
              coaches={coachList}
              isDefaultToday={isDefaultRange}
            />
          </div>

          <AdminAppointmentsGuestTable
            appointments={filteredClasses as any}
            coaches={coachList}
            clients={clientList}
            tenantGraceHours={tenantGraceHours}
            statusFilter="all"
          />
        </>
      ) : (templates ?? []).length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-admin-light)] flex items-center justify-center">
            <CalendarRange size={28} className="text-[var(--color-admin)]" />
          </div>
          <div>
            <p className="font-medium text-[var(--color-foreground)]">No hay horarios recurrentes</p>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Crea un horario recurrente (día, hora y cupo) para generar clases reservables automáticamente cada semana.
              Para una clase puntual con invitados específicos, usa &quot;Nueva → Clase&quot; en Citas.
            </p>
          </div>
          <NewClassTemplateButton branches={branchList} coaches={coachList} defaultCapacity={defaultCapacity} />
        </div>
      ) : (
        <>
          {activeTemplates.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">
                Activas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeTemplates.map((t) => (
                  <ClassTemplateCard key={t.id} template={t} branches={branchList} coaches={coachList} defaultCapacity={defaultCapacity} />
                ))}
              </div>
            </div>
          )}

          {inactiveTemplates.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">
                Inactivas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inactiveTemplates.map((t) => (
                  <ClassTemplateCard key={t.id} template={t} branches={branchList} coaches={coachList} defaultCapacity={defaultCapacity} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
