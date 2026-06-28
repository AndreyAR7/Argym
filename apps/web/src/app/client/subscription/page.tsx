import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { CreditCard, CheckCircle2, Calendar, Tag, Package } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Mis Suscripciones' }

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Activa',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trial:     { label: 'Prueba',         cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  past_due:  { label: 'Pago pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled: { label: 'Cancelada',      cls: 'bg-red-50 text-red-700 border-red-200' },
  expired:   { label: 'Vencida',        cls: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]' },
  pending:   { label: 'Pendiente',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'mes',
  yearly: 'año',
  one_time: 'único',
}

function SubscriptionCard({ sub, compact = false }: { sub: any; compact?: boolean }) {
  const s = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.expired
  const plan = sub.plans
  const promo = sub.promotions
  const features: any[] = Array.isArray(plan?.features) ? plan.features : []
  const isActive = sub.status === 'active'

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{plan?.name ?? 'Plan'}</p>
          {promo && (
            <div className="flex items-center gap-1 mt-0.5">
              <Tag size={10} className="text-violet-500" />
              <span className="text-xs text-violet-600">{promo.title}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--color-muted-foreground)]">
            {sub.start_date && <span>{formatDate(sub.start_date)}</span>}
            {sub.end_date && <span>→ {formatDate(sub.end_date)}</span>}
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border flex-shrink-0 ${s.cls}`}>
          {s.label}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border-2 bg-[var(--color-card)] p-5 relative overflow-hidden ${
        isActive ? 'border-[var(--color-client)]' : 'border-[var(--color-border)]'
      }`}
    >
      {isActive && <div className="h-0.5 bg-[var(--color-client)] w-full absolute top-0 left-0" />}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--color-foreground)]">{plan?.name ?? 'Plan'}</p>
          {plan?.description && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-2">{plan.description}</p>
          )}
          {promo && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200">
                {promo.type === 'bundle'
                  ? <Package size={10} className="text-violet-600" />
                  : <Tag size={10} className="text-violet-600" />
                }
                <span className="text-[10px] font-semibold text-violet-700">{promo.title}</span>
              </div>
              {(promo.discount_percentage || promo.discount_amount) && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  {promo.discount_percentage
                    ? `${promo.discount_percentage}% desc.`
                    : `₡${Number(promo.discount_amount).toLocaleString('es-CR')} desc.`
                  }
                </span>
              )}
            </div>
          )}
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border flex-shrink-0 ${s.cls}`}>
          {s.label}
        </span>
      </div>

      {plan?.price != null && (
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-sm text-[var(--color-muted-foreground)]">{plan.currency}</span>
          <span className="text-2xl font-bold text-[var(--color-foreground)]">
            {Number(plan.price).toLocaleString('es-CR')}
          </span>
          {plan.billing_cycle !== 'one_time' && (
            <span className="text-sm text-[var(--color-muted-foreground)]">
              /{CYCLE_LABELS[plan.billing_cycle] ?? plan.billing_cycle}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--color-muted-foreground)]">
        {sub.start_date && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            Inicio: {formatDate(sub.start_date)}
          </span>
        )}
        {sub.end_date && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {isActive ? 'Vence' : 'Venció'}: {formatDate(sub.end_date)}
          </span>
        )}
      </div>

      {isActive && features.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {features.map((f: any, i: number) => (
            <li key={i} className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
              <CheckCircle2 size={13} className="text-[var(--color-client)] flex-shrink-0" />
              {typeof f === 'string' ? f : (f.name ?? JSON.stringify(f))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default async function ClientSubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subscriptions, error: subErr } = await supabase
    .from('user_subscriptions')
    .select(`
      id, status, start_date, end_date,
      plans!plan_id(id, name, description, price, currency, billing_cycle, features),
      promotions!promotion_id(id, title, type, discount_percentage, discount_amount)
    `)
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  if (subErr) console.error('[subscription page]', subErr.message)

  const subs = subscriptions ?? []
  const activeSubs = subs.filter((s: any) => ['active', 'trial'].includes(s.status))
  const historySubs = subs.filter((s: any) => !['active', 'trial'].includes(s.status))

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Mis Suscripciones"
        subtitle={
          subs.length === 0
            ? 'Aún no tienes planes contratados'
            : `${subs.length} suscripción${subs.length !== 1 ? 'es' : ''} en total`
        }
      />

      {subs.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
            <CreditCard size={20} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sin suscripciones</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Contacta con tu gimnasio o explora los planes disponibles.
          </p>
          <Link
            href="/client/planes"
            className="inline-flex items-center mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-client)' }}
          >
            Ver planes
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {activeSubs.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">
                Activas
              </h2>
              <div className="space-y-4">
                {activeSubs.map((sub: any) => (
                  <SubscriptionCard key={sub.id} sub={sub} />
                ))}
              </div>
            </div>
          )}

          {historySubs.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">
                Historial
              </h2>
              <div className="space-y-2">
                {historySubs.map((sub: any) => (
                  <SubscriptionCard key={sub.id} sub={sub} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/client/planes"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-client)', color: 'white' }}
        >
          Ver planes disponibles
        </Link>
      </div>
    </div>
  )
}
