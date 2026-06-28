import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { CreditCard, CheckCircle2, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Mi Suscripción' }

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Activa', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trial:    { label: 'Prueba', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  past_due: { label: 'Pago pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled:{ label: 'Cancelada', cls: 'bg-red-50 text-red-700 border-red-200' },
  expired:  { label: 'Vencida', cls: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]' },
}

export default async function ClientSubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subscriptions, error: subErr } = await supabase
    .from('user_subscriptions')
    .select('id, status, start_date, end_date, plans(name, description, price, currency, billing_cycle, features)')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  if (subErr) console.error('[subscription page]', subErr.message)

  const active = (subscriptions ?? []).find((s: any) => ['active', 'trial'].includes(s.status))
  const history = (subscriptions ?? []).filter((s: any) => !['active', 'trial'].includes(s.status))

  const CYCLE_LABELS: Record<string, string> = { monthly: 'mes', yearly: 'año', one_time: 'único' }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <PageHeader
        title="Mi Suscripción"
        subtitle="Información sobre tu plan actual"
      />

      {!active ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
            <CreditCard size={20} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sin suscripción activa</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Contacta con tu gimnasio para activar tu membresía.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {/* Active plan card */}
          <div className="rounded-xl border-2 border-[var(--color-client)] bg-[var(--color-card)] p-5 relative overflow-hidden">
            <div className="h-0.5 bg-[var(--color-client)] w-full absolute top-0 left-0" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--color-foreground)]">{(active as any).plans?.name ?? 'Plan'}</p>
                {(active as any).plans?.description && (
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{(active as any).plans.description}</p>
                )}
              </div>
              {(() => {
                const s = STATUS_CONFIG[active.status] ?? STATUS_CONFIG.expired
                return (
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border flex-shrink-0 ${s.cls}`}>
                    {s.label}
                  </span>
                )
              })()}
            </div>

            {(active as any).plans?.price != null && (
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-sm text-[var(--color-muted-foreground)]">{(active as any).plans.currency}</span>
                <span className="text-2xl font-bold text-[var(--color-foreground)]">
                  {(active as any).plans.price.toLocaleString('es-CR')}
                </span>
                {(active as any).plans.billing_cycle !== 'one_time' && (
                  <span className="text-sm text-[var(--color-muted-foreground)]">/{CYCLE_LABELS[(active as any).plans.billing_cycle] ?? ''}</span>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--color-muted-foreground)]">
              {(active as any).start_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  Inicio: {formatDate((active as any).start_date)}
                </span>
              )}
              {(active as any).end_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  Vence: {formatDate((active as any).end_date)}
                </span>
              )}
            </div>

            {/* Features */}
            {Array.isArray((active as any).plans?.features) && (active as any).plans.features.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {(active as any).plans.features.map((f: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
                    <CheckCircle2 size={13} className="text-[var(--color-client)] flex-shrink-0" />
                    {f.name ?? JSON.stringify(f)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">Historial</h2>
          <div className="space-y-2">
            {history.map((sub: any) => {
              const s = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.expired
              return (
                <div key={sub.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] opacity-70">
                  <p className="text-sm text-[var(--color-foreground)]">{sub.plans?.name ?? 'Plan'}</p>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${s.cls}`}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <a href="/client/planes"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-client)', color: 'white' }}>
          Ver planes disponibles
        </a>
      </div>
    </div>
  )
}
