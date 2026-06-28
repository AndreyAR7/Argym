import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Apple, Utensils, Target, CreditCard } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Mi Nutrición' }

const PLAN_FIELDS = 'id, name, description, calories_target, protein_g, carbs_g, fat_g, goal'

function MacroCard({ label, value, unit, color }: { label: string; value: number | null; unit: string; color: string }) {
  if (!value) return null
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center">
      <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-[var(--color-muted-foreground)]">{unit}</p>
    </div>
  )
}

function NutritionPlanCard({ plan, badge }: { plan: any; badge?: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="h-0.5 bg-emerald-500 w-full" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[var(--color-foreground)]">{plan.name}</h2>
            {plan.description && (
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{plan.description}</p>
            )}
            {plan.goal && (
              <div className="flex items-center gap-1 mt-2">
                <Target size={12} className="text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">{plan.goal}</span>
              </div>
            )}
          </div>
          {badge && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 flex-shrink-0">
              {badge}
            </span>
          )}
        </div>

        {(plan.calories_target || plan.protein_g || plan.carbs_g || plan.fat_g) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <MacroCard label="Calorías" value={plan.calories_target} unit="kcal/día" color="text-[var(--color-foreground)]" />
            <MacroCard label="Proteína" value={plan.protein_g} unit="gramos" color="text-blue-600" />
            <MacroCard label="Carbos" value={plan.carbs_g} unit="gramos" color="text-amber-600" />
            <MacroCard label="Grasas" value={plan.fat_g} unit="gramos" color="text-red-500" />
          </div>
        )}
      </div>
    </div>
  )
}

export default async function ClientNutritionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Active subscription plan IDs + promotion IDs
  const { data: activeSubs } = await supabase
    .from('user_subscriptions')
    .select('plan_id, promotion_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const planIds = [...new Set((activeSubs ?? []).map((s: any) => s.plan_id).filter(Boolean))]
  const promotionIds = [...new Set((activeSubs ?? []).map((s: any) => s.promotion_id).filter(Boolean))]

  const [directResult, planNutrResult, promoNutrResult] = await Promise.all([
    // Directly assigned by coach
    supabase
      .from('nutrition_assignments')
      .select(`note, assigned_at, nutrition_plans!nutrition_plan_id(${PLAN_FIELDS})`)
      .eq('client_id', user.id)
      .order('assigned_at', { ascending: false }),

    // Via subscription plan
    planIds.length > 0
      ? supabase
          .from('plan_nutritions')
          .select(`nutrition_plan_id, nutrition_plans!nutrition_plan_id(${PLAN_FIELDS})`)
          .in('plan_id', planIds)
      : Promise.resolve({ data: [] }),

    // Via promotion
    promotionIds.length > 0
      ? supabase
          .from('promotion_nutritions')
          .select(`nutrition_plan_id, nutrition_plans!nutrition_plan_id(${PLAN_FIELDS})`)
          .in('promotion_id', promotionIds)
      : Promise.resolve({ data: [] }),
  ])

  // Deduplicate by plan ID
  const seen = new Set<string>()
  const allPlans: { plan: any; badge: string }[] = []

  for (const row of directResult.data ?? []) {
    const p = (row as any).nutrition_plans
    if (p && !seen.has(p.id)) { seen.add(p.id); allPlans.push({ plan: p, badge: 'Coach' }) }
  }
  for (const row of planNutrResult.data ?? []) {
    const p = (row as any).nutrition_plans
    if (p && !seen.has(p.id)) { seen.add(p.id); allPlans.push({ plan: p, badge: 'Plan' }) }
  }
  for (const row of promoNutrResult.data ?? []) {
    const p = (row as any).nutrition_plans
    if (p && !seen.has(p.id)) { seen.add(p.id); allPlans.push({ plan: p, badge: 'Promo' }) }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Mi Nutrición"
        subtitle={
          allPlans.length > 0
            ? `${allPlans.length} plan${allPlans.length !== 1 ? 'es' : ''} nutricional${allPlans.length !== 1 ? 'es' : ''} disponible${allPlans.length !== 1 ? 's' : ''}`
            : 'Planes nutricionales de tu suscripción'
        }
      />

      {allPlans.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
            <Apple size={20} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sin planes nutricionales</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Tu coach te asignará un plan, o adquiere un plan que incluya nutrición.
          </p>
          <Link
            href="/client/planes"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-client)' }}
          >
            <CreditCard size={14} />
            Ver planes
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {allPlans.map(({ plan, badge }) => (
            <NutritionPlanCard key={plan.id} plan={plan} badge={badge} />
          ))}
        </div>
      )}
    </div>
  )
}
