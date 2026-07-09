import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { BillingPortalButton } from './billing-client'
import { getMyInvoicesAction, type StripeInvoice } from './actions'
import {
  Receipt,
  CreditCard,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  MessageCircle,
} from 'lucide-react'

export const metadata = { title: 'Facturación' }

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  active: {
    label: 'Activa',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 size={11} />,
  },
  trial: {
    label: 'Prueba',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Clock size={11} />,
  },
  past_due: {
    label: 'Pago pendiente',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <AlertCircle size={11} />,
  },
  cancelled: {
    label: 'Cancelada',
    cls: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle size={11} />,
  },
  expired: {
    label: 'Vencida',
    cls: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]',
    icon: <XCircle size={11} />,
  },
}

const INVOICE_STATUS: Record<
  string,
  { label: string; cls: string }
> = {
  paid:   { label: 'Pagada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  open:   { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  draft:  { label: 'Borrador', cls: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]' },
  void:   { label: 'Anulada', cls: 'bg-red-50 text-red-700 border-red-200' },
  uncollectible: { label: 'Incobrable', cls: 'bg-red-50 text-red-700 border-red-200' },
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'mes',
  yearly:  'año',
  one_time: 'único',
}

function formatAmount(amount: number, currency: string): string {
  // Stripe stores amounts in cents for most currencies; CRC is zero-decimal
  const zeroCurrencies = ['crc', 'clp', 'jpy', 'krw', 'bif', 'gnf', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'xaf', 'xof']
  const divisor = zeroCurrencies.includes(currency.toLowerCase()) ? 1 : 100
  const value = amount / divisor
  const sym = currency.toLowerCase() === 'crc' ? '₡' : currency.toUpperCase()

  if (currency.toLowerCase() === 'crc') {
    return `${sym}${value.toLocaleString('es-CR')}`
  }
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(value)
}

function formatUnixDate(ts: number): string {
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts * 1000))
}

function formatPeriod(start: number, end: number): string {
  return `${formatUnixDate(start)} – ${formatUnixDate(end)}`
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.expired
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function InvoiceStatusChip({ status }: { status: string | null }) {
  const cfg = INVOICE_STATUS[status ?? ''] ?? INVOICE_STATUS.draft
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  )
}

interface SubscriptionCardProps {
  planName: string
  price: number | null
  currency: string | null
  billingInterval: string | null
  status: string
  periodEnd: string | null
  stripeConnected: boolean
}

function SubscriptionCard({
  planName,
  price,
  currency,
  billingInterval,
  status,
  periodEnd,
  stripeConnected,
}: SubscriptionCardProps) {
  const isActive = status === 'active'

  return (
    <div
      className={`rounded-xl border-2 bg-[var(--color-card)] p-5 relative overflow-hidden ${
        isActive ? 'border-[var(--color-client)]' : 'border-[var(--color-border)]'
      }`}
    >
      {isActive && (
        <div className="h-0.5 bg-[var(--color-client)] w-full absolute top-0 left-0" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--color-foreground)]">{planName}</p>
          {price != null && (
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {currency ?? ''}
              </span>
              <span className="text-xl font-bold text-[var(--color-foreground)]">
                {Number(price).toLocaleString('es-CR')}
              </span>
              {billingInterval && billingInterval !== 'one_time' && (
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  /{CYCLE_LABELS[billingInterval] ?? billingInterval}
                </span>
              )}
            </div>
          )}
          {periodEnd && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <Calendar size={11} />
              {isActive ? 'Vence el' : 'Venció el'}{' '}
              {new Intl.DateTimeFormat('es-CR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(periodEnd))}
            </p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {stripeConnected && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <BillingPortalButton />
        </div>
      )}
    </div>
  )
}

function InvoiceTable({ invoices }: { invoices: StripeInvoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
          <Receipt size={18} className="text-[var(--color-border)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">No hay facturas aún</p>
        <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
          Las facturas aparecerán aquí una vez que se procese tu primer cobro.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Fecha
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Monto
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Estado
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] hidden md:table-cell">
              Periodo
            </th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
              Descarga
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className="bg-[var(--color-card)] hover:bg-[var(--color-muted)]/30 transition-colors"
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div>
                  <p className="text-[var(--color-foreground)] font-medium text-xs">
                    {formatUnixDate(inv.created)}
                  </p>
                  {inv.number && (
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      #{inv.number}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="font-semibold text-[var(--color-foreground)]">
                  {formatAmount(inv.amount_paid, inv.currency)}
                </span>
              </td>
              <td className="px-4 py-3">
                <InvoiceStatusChip status={inv.status} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {formatPeriod(inv.period_start, inv.period_end)}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {inv.invoice_pdf ? (
                  <a
                    href={inv.invoice_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Descargar PDF"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-client)] hover:bg-[var(--color-client-light)] transition-colors"
                  >
                    <Download size={13} />
                  </a>
                ) : (
                  <span className="text-[var(--color-border)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default async function ClientBillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch active subscription + plan details
  const { data: subRow } = await supabase
    .from('plan_subscriptions')
    .select(`
      id,
      status,
      current_period_start,
      current_period_end,
      stripe_subscription_id,
      plans!plan_id (
        id,
        name,
        price,
        billing_interval,
        currency
      )
    `)
    .eq('user_id', user.id)
    .in('status', ['active', 'trial', 'past_due'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  const plan = (subRow?.plans as any) ?? null
  const hasStripeLink = Boolean(subRow?.stripe_subscription_id)

  // Fetch invoices in parallel (server action is a plain async call here)
  const { invoices = [], stripeConnected } = await getMyInvoicesAction()

  const noStripeMessage = !subRow?.stripe_subscription_id && !stripeConnected

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Facturación"
        subtitle="Consulta tu suscripción activa y el historial de pagos"
      />

      <div className="mt-6 space-y-8">
        {/* ── Current Subscription ── */}
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">
            Suscripción actual
          </h2>

          {subRow && plan ? (
            <SubscriptionCard
              planName={plan.name ?? 'Plan'}
              price={plan.price ?? null}
              currency={plan.currency ?? null}
              billingInterval={plan.billing_interval ?? null}
              status={subRow.status ?? 'expired'}
              periodEnd={subRow.current_period_end ?? null}
              stripeConnected={hasStripeLink}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
                <CreditCard size={18} className="text-[var(--color-border)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                Sin suscripción activa
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                No tienes ninguna suscripción activa en este momento.
              </p>
            </div>
          )}
        </section>

        {/* ── No Stripe integration notice ── */}
        {noStripeMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-4">
            <MessageCircle
              size={16}
              className="flex-shrink-0 mt-0.5 text-[var(--color-muted-foreground)]"
            />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Tu plan está gestionado por tu gimnasio. Contacta a tu entrenador
              para consultas de facturación.
            </p>
          </div>
        )}

        {/* ── Invoice History ── */}
        {stripeConnected && (
          <section>
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-3">
              Historial de pagos
            </h2>
            <InvoiceTable invoices={invoices} />
          </section>
        )}
      </div>
    </div>
  )
}
