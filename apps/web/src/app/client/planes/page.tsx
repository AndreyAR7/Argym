import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { CheckCircle2, CreditCard, Tag, Sparkles } from 'lucide-react'
import { SubscribeButton } from '@/components/client/subscribe-button'

export const metadata = { title: 'Planes Disponibles' }

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'mes',
  yearly: 'año',
  one_time: 'único',
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export default async function ClientPlanesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Fetch client profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, client_level, branch_id, stripe_customer_id, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // 2. Fetch active plans
  const { data: allPlans } = await supabase
    .from('plans')
    .select('id, name, description, price, currency, billing_cycle, features, plan_tier')
    .eq('is_active', true)
    .eq('tenant_id', profile.tenant_id)
    .order('price', { ascending: true })

  // Filter by client level: show plans with no tier or matching tier
  const plans = (allPlans ?? []).filter((p: any) => {
    if (!p.plan_tier) return true
    if (!profile.client_level) return true
    return p.plan_tier === profile.client_level
  })

  // 3. Fetch active promotions (real column names: title, discount_percentage, discount_amount)
  const { data: promotions } = await supabase
    .from('promotions')
    .select('id, title, discount_percentage, discount_amount, applies_to_plan_id')
    .eq('is_active', true)
    .eq('tenant_id', profile.tenant_id)

  // 4. Fetch client's active subscriptions
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('id, status, plan_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'trial'])

  const activeSubscriptions = subscriptions ?? []
  const hasActiveSubscription = activeSubscriptions.length > 0
  const subscribedPlanIds = new Set(activeSubscriptions.map((s: any) => s.plan_id))

  // Map promotions by plan id for quick lookup
  const promoByPlan = new Map<string, any>()
  for (const promo of promotions ?? []) {
    if (promo.applies_to_plan_id) {
      promoByPlan.set(promo.applies_to_plan_id, promo)
    }
  }

  function computeDiscountedPrice(price: number, promo: any): number {
    if (!promo) return price
    if (promo.discount_percentage) {
      return Math.max(0, price - (price * Number(promo.discount_percentage)) / 100)
    }
    if (promo.discount_amount) {
      return Math.max(0, price - Number(promo.discount_amount))
    }
    return price
  }

  const clientLevelLabel = profile.client_level ? LEVEL_LABELS[profile.client_level] ?? profile.client_level : null

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Planes Disponibles"
        subtitle={
          clientLevelLabel
            ? `Mostrando planes para tu nivel: ${clientLevelLabel}`
            : 'Elige el plan que mejor se adapta a ti'
        }
      />

      {/* Active subscription banner */}
      {hasActiveSubscription && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--color-client)] bg-[var(--color-client-light)] px-4 py-3">
          <Sparkles size={16} className="text-[var(--color-client)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-foreground)]">
            Ya tienes una suscripción activa. Puedes agregar otro plan si deseas.{' '}
            <Link
              href="/client/subscription"
              className="font-semibold underline underline-offset-2 text-[var(--color-client)]"
            >
              Ver mi suscripción
            </Link>
          </p>
        </div>
      )}

      {/* Plans grid */}
      {plans.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-[var(--color-border)] p-16 text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-4">
            <CreditCard size={22} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">No hay planes disponibles</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Por el momento no hay planes publicados para tu nivel. Contacta con tu gimnasio.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan: any) => {
            const promo = promoByPlan.get(plan.id)
            const alreadySubscribed = subscribedPlanIds.has(plan.id)
            const finalPrice = promo ? computeDiscountedPrice(plan.price, promo) : plan.price
            const discountLabel = promo?.discount_percentage
              ? `${promo.discount_percentage}% descuento`
              : promo?.discount_amount
              ? `-${plan.currency ?? ''} ${promo.discount_amount} descuento`
              : null

            const features: any[] = Array.isArray(plan.features) ? plan.features : []

            return (
              <div
                key={plan.id}
                className="relative flex flex-col rounded-xl border-2 border-[var(--color-client)] bg-[var(--color-card)] overflow-hidden shadow-sm"
              >
                {/* Top accent bar */}
                <div className="h-1 bg-[var(--color-client)] w-full" />

                {/* Promotion badge */}
                {promo && discountLabel && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                    <Tag size={9} />
                    {discountLabel}
                  </div>
                )}

                <div className="flex flex-col flex-1 p-5 gap-4">
                  {/* Plan name & description */}
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)] pr-20">{plan.name}</p>
                    {plan.description && (
                      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{plan.description}</p>
                    )}
                  </div>

                  {/* Price */}
                  {plan.price != null && (
                    <div className="flex flex-col gap-0.5">
                      {promo && finalPrice !== plan.price ? (
                        <>
                          <span className="text-xs text-[var(--color-muted-foreground)] line-through">
                            {plan.currency ?? ''} {Number(plan.price).toLocaleString('es-CR')}
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs text-[var(--color-muted-foreground)]">{plan.currency ?? ''}</span>
                            <span className="text-3xl font-bold text-[var(--color-foreground)]">
                              {finalPrice.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </span>
                            {plan.billing_cycle && plan.billing_cycle !== 'one_time' && (
                              <span className="text-sm text-[var(--color-muted-foreground)]">
                                /{CYCLE_LABELS[plan.billing_cycle] ?? plan.billing_cycle}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-[var(--color-muted-foreground)]">{plan.currency ?? ''}</span>
                          <span className="text-3xl font-bold text-[var(--color-foreground)]">
                            {Number(plan.price).toLocaleString('es-CR')}
                          </span>
                          {plan.billing_cycle && plan.billing_cycle !== 'one_time' && (
                            <span className="text-sm text-[var(--color-muted-foreground)]">
                              /{CYCLE_LABELS[plan.billing_cycle] ?? plan.billing_cycle}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Features list */}
                  {features.length > 0 && (
                    <ul className="space-y-1.5 flex-1">
                      {features.map((f: any, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
                          <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                          {typeof f === 'string' ? f : (f.name ?? JSON.stringify(f))}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Action */}
                  <div className="mt-auto pt-2">
                    {alreadySubscribed ? (
                      <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 size={14} />
                        Ya suscrito
                      </div>
                    ) : (
                      <SubscribeButton
                        planId={plan.id}
                        planName={plan.name}
                        promotionId={promo?.id}
                        finalPrice={finalPrice}
                        currency={plan.currency ?? 'CRC'}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
