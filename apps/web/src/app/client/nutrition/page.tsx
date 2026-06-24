import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Apple, Utensils } from 'lucide-react'

export const metadata = { title: 'Mi Plan de Nutrición' }

export default async function ClientNutritionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Try to get the most recent active nutrition plan assignment
  const { data: assignment } = await supabase
    .from('nutrition_plan_assignments')
    .select(`
      id, note, assigned_at,
      nutrition_plans (id, title, description, status, daily_calories, protein_g, carbs_g, fat_g, meals)
    `)
    .eq('user_id', user.id)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .single()

  const plan = (assignment as any)?.nutrition_plans

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Mi Plan de Nutrición"
        subtitle="Plan asignado por tu coach"
      />

      {!plan ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
            <Apple size={20} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sin plan de nutrición</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Tu coach te asignará un plan nutricional pronto.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {/* Plan header */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <h2 className="font-semibold text-[var(--color-foreground)]">{plan.title}</h2>
            {plan.description && <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{plan.description}</p>}
          </div>

          {/* Macros */}
          {(plan.daily_calories || plan.protein_g || plan.carbs_g || plan.fat_g) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {plan.daily_calories && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Calorías</p>
                  <p className="mt-1 text-xl font-bold text-[var(--color-foreground)]">{plan.daily_calories}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">kcal/día</p>
                </div>
              )}
              {plan.protein_g && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Proteína</p>
                  <p className="mt-1 text-xl font-bold text-blue-600">{plan.protein_g}g</p>
                </div>
              )}
              {plan.carbs_g && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Carbohidratos</p>
                  <p className="mt-1 text-xl font-bold text-amber-600">{plan.carbs_g}g</p>
                </div>
              )}
              {plan.fat_g && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-center">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Grasas</p>
                  <p className="mt-1 text-xl font-bold text-red-500">{plan.fat_g}g</p>
                </div>
              )}
            </div>
          )}

          {/* Meals */}
          {Array.isArray(plan.meals) && plan.meals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)] flex items-center gap-2">
                <Utensils size={14} />
                Comidas del día
              </h3>
              {plan.meals.map((meal: any, i: number) => (
                <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                  <p className="font-medium text-sm text-[var(--color-foreground)]">{meal.name ?? `Comida ${i + 1}`}</p>
                  {meal.time && <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{meal.time}</p>}
                  {Array.isArray(meal.foods) && meal.foods.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {meal.foods.map((food: any, j: number) => (
                        <li key={j} className="text-sm text-[var(--color-foreground)] flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-[var(--color-muted-foreground)] flex-shrink-0" />
                          {typeof food === 'string' ? food : food.name ?? JSON.stringify(food)}
                          {food.amount && <span className="text-xs text-[var(--color-muted-foreground)]">— {food.amount}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {meal.description && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{meal.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
