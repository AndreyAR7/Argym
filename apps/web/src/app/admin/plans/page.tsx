import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { PlanCard } from '@/components/admin/plan-card'
import { NewPlanButton } from '@/components/admin/new-plan-button'
import { LayoutGrid } from 'lucide-react'

export const metadata = { title: 'Planes' }

export default async function PlansPage() {
  const session = await getSessionData()
  const { supabase, tenantId } = session!

  // Fetch all plans (active + inactive) with subscriber counts
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, description, price, currency, billing_cycle, features, is_active, sort_order, expiry_date')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  // Get subscriber counts per plan
  const { data: subCounts } = await supabase
    .from('user_subscriptions')
    .select('plan_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const countMap: Record<string, number> = {}
  for (const sub of subCounts ?? []) {
    countMap[sub.plan_id] = (countMap[sub.plan_id] ?? 0) + 1
  }

  const plansWithCounts = (plans ?? []).map((plan) => ({
    ...plan,
    features: Array.isArray(plan.features) ? plan.features : [],
    subscriber_count: countMap[plan.id] ?? 0,
  }))

  const activePlans = plansWithCounts.filter((p) => p.is_active)
  const inactivePlans = plansWithCounts.filter((p) => !p.is_active)

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Planes de suscripción"
        subtitle={`${activePlans.length} activo${activePlans.length !== 1 ? 's' : ''} · ${plansWithCounts.reduce((s, p) => s + p.subscriber_count, 0)} suscriptores totales`}
      >
        <NewPlanButton />
      </PageHeader>

      {plansWithCounts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-admin-light)] flex items-center justify-center">
            <LayoutGrid size={28} className="text-[var(--color-admin)]" />
          </div>
          <div>
            <p className="font-medium text-[var(--color-foreground)]">No hay planes creados</p>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Crea tu primer plan de suscripción para asignarlo a los clientes.
            </p>
          </div>
          <NewPlanButton />
        </div>
      ) : (
        <>
          {/* Active plans */}
          {activePlans.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">
                Planes activos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activePlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive plans */}
          {inactivePlans.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">
                Planes inactivos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inactivePlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
