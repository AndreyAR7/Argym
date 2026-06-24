import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { InvoiceRow } from '@/components/admin/invoice-row'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Clock, AlertTriangle, Users, Receipt } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Facturación' }

const STATUS_TABS = [
  { value: 'all',     label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid',    label: 'Pagadas' },
  { value: 'overdue', label: 'Vencidas' },
]

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const params = await searchParams
  const statusFilter = params.status ?? 'all'
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const PAGE_SIZE = 25

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  // ── Billing summary ──
  const [summaryResult, invoicesResult, countResult] = await Promise.all([
    supabase.rpc('get_billing_summary', { p_tenant_id: tenantId }),

    // Invoices with user and plan info
    (() => {
      let q = supabase
        .from('invoices')
        .select(`
          id, invoice_number, status, amount, currency,
          description, issue_date, due_date, paid_at,
          user:profiles!user_id ( full_name, avatar_url ),
          subscription:user_subscriptions!subscription_id (
            plan:plans!plan_id ( name )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      return q
    })(),

    // Total count for pagination
    (() => {
      let q = supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      return q
    })(),
  ])

  const summary = summaryResult.data?.[0] ?? {
    mrr: 0,
    invoices_pending: 0,
    invoices_overdue: 0,
    subscriptions_active: 0,
    subscriptions_expiring_7d: 0,
  }

  const invoices = invoicesResult.data ?? []
  const totalCount = countResult.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function buildUrl(s?: string, p?: number) {
    const sp = new URLSearchParams()
    const st = s ?? statusFilter
    const pg = p ?? page
    if (st !== 'all') sp.set('status', st)
    if (pg > 1) sp.set('page', String(pg))
    const qs = sp.toString()
    return `/admin/billing${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Facturación"
        subtitle="Ingresos, facturas y suscripciones activas"
      />

      {/* ── KPI Cards ── */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ingresos mensuales"
          value={formatCurrency(summary.mrr ?? 0, 'CRC')}
          icon={<TrendingUp size={18} />}
          accentClass="text-[var(--color-admin)]"
        />
        <StatCard
          label="Suscripciones activas"
          value={String(summary.subscriptions_active ?? 0)}
          icon={<Users size={18} />}
          accentClass="text-[var(--color-muted-foreground)]"
        />
        <StatCard
          label="Facturas pendientes"
          value={String(summary.invoices_pending ?? 0)}
          icon={<Clock size={18} />}
          accentClass={Number(summary.invoices_pending) > 0 ? 'text-amber-500' : 'text-[var(--color-muted-foreground)]'}
          href={buildUrl('pending', 1)}
        />
        <StatCard
          label="Facturas vencidas"
          value={String(summary.invoices_overdue ?? 0)}
          icon={<AlertTriangle size={18} />}
          accentClass={Number(summary.invoices_overdue) > 0 ? 'text-[var(--color-destructive)]' : 'text-[var(--color-muted-foreground)]'}
          href={buildUrl('overdue', 1)}
        />
      </div>

      {/* Expiring soon alert */}
      {Number(summary.subscriptions_expiring_7d) > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{summary.subscriptions_expiring_7d}</strong> suscripción{Number(summary.subscriptions_expiring_7d) !== 1 ? 'es' : ''} vencen en los próximos 7 días.
          </p>
        </div>
      )}

      {/* ── Invoice List ── */}
      <div className="mt-8">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 overflow-x-auto mb-4">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value
            return (
              <Link
                key={tab.value}
                href={buildUrl(tab.value, 1)}
                className={`px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-[var(--color-border)]">
            <Receipt size={36} className="text-[var(--color-border)]" />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {statusFilter === 'pending'
                  ? 'No hay facturas pendientes'
                  : statusFilter === 'overdue'
                  ? 'No hay facturas vencidas'
                  : statusFilter === 'paid'
                  ? 'No hay facturas pagadas'
                  : 'No hay facturas registradas'}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Las facturas se generan automáticamente al asignar un plan.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                      Factura
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
                  {invoices.map((inv: any) => (
                    <InvoiceRow
                      key={inv.id}
                      id={inv.id}
                      invoiceNumber={inv.invoice_number}
                      status={inv.status}
                      amount={inv.amount}
                      currency={inv.currency}
                      description={inv.description}
                      issueDate={inv.issue_date}
                      dueDate={inv.due_date}
                      paidAt={inv.paid_at}
                      userName={inv.user?.full_name ?? 'Sin nombre'}
                      userAvatarUrl={inv.user?.avatar_url ?? null}
                      planName={inv.subscription?.plan?.name ?? null}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {totalCount} facturas · página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={buildUrl(undefined, page - 1)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                    >
                      ← Anterior
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={buildUrl(undefined, page + 1)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                    >
                      Siguiente →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
