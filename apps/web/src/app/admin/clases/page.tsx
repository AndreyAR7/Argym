import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { ClassTemplateCard } from '@/components/admin/class-template-card'
import { NewClassTemplateButton } from '@/components/admin/new-class-template-button'
import { CalendarRange } from 'lucide-react'

export const metadata = { title: 'Clases' }

export default async function ClassTemplatesPage() {
  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const [{ data: branches }, { data: coaches }, { data: tenant }, { data: templates }] = await Promise.all([
    supabase.from('branches').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).order('name'),
    supabase.rpc('get_profiles_by_role', { role_name: 'coach' }),
    supabase.from('tenants').select('default_class_capacity').eq('id', tenantId).single(),
    supabase
      .from('class_templates')
      .select('id, name, branch_id, coach_id, day_of_week, start_time, end_time, max_participants, is_active')
      .eq('tenant_id', tenantId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
  ])

  const branchList = branches ?? []
  const coachList = coaches ?? []
  const defaultCapacity = tenant?.default_class_capacity ?? 12
  const activeTemplates = (templates ?? []).filter((t) => t.is_active)
  const inactiveTemplates = (templates ?? []).filter((t) => !t.is_active)

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Clases grupales"
        subtitle={`${activeTemplates.length} clase${activeTemplates.length !== 1 ? 's' : ''} activa${activeTemplates.length !== 1 ? 's' : ''}`}
      >
        <NewClassTemplateButton branches={branchList} coaches={coachList} defaultCapacity={defaultCapacity} />
      </PageHeader>

      {(templates ?? []).length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-admin-light)] flex items-center justify-center">
            <CalendarRange size={28} className="text-[var(--color-admin)]" />
          </div>
          <div>
            <p className="font-medium text-[var(--color-foreground)]">No hay clases creadas</p>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Crea un horario recurrente (día, hora y cupo) para empezar a generar clases reservables.
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
