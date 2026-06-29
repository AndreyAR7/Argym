'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Download, TrendingUp, TrendingDown, Users, CreditCard,
  RefreshCw, Loader2, Activity, Target, BarChart2,
  Calendar, ChevronDown, ChevronUp,
} from 'lucide-react'
import type {
  AnalyticsData, DetailTab,
  DetailedClient, DetailedTransaction, DetailedSubscription, DetailedAppointment,
} from './actions'
import { getDetailedDataAction } from './actions'

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(n: number, currency = 'CRC') {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${currency} ${(n / 1_000).toFixed(1)}K`
  return `${currency} ${n.toLocaleString('es-CR', { minimumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function pctDelta(current: number, previous: number): { pct: number; up: boolean } | null {
  if (!previous) return null
  const pct = ((current - previous) / previous) * 100
  return { pct: Math.abs(pct), up: pct >= 0 }
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`
}

function weekLabel(yw: string) {
  const parts = yw.split('W')
  return `S${parts[1] ?? yw}`
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({
  data,
  color = 'var(--color-admin)',
  highlightLast = true,
}: {
  data: { label: string; value: number }[]
  valueFormatter?: (v: number) => string
  color?: string
  highlightLast?: boolean
}) {
  if (!data.length) return <p className="text-xs text-[var(--color-muted-foreground)] py-4 text-center">Sin datos para el período</p>

  const maxVal = Math.max(...data.map(d => d.value), 1)
  const W = 600; const H = 180; const labelH = 28
  const chartH = H - labelH
  const barW = Math.floor((W / data.length) * 0.6)
  const gap   = (W / data.length) - barW
  const maxIdx = data.reduce((mi, d, i) => d.value > data[mi].value ? i : mi, 0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map(f => {
        const y = chartH - chartH * f
        return <line key={f} x1={0} x2={W} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 3" />
      })}
      {data.map((d, i) => {
        const barH = Math.max((d.value / maxVal) * chartH, d.value > 0 ? 2 : 0)
        const x = i * (W / data.length) + gap / 2
        const y = chartH - barH
        const isLast = highlightLast && i === data.length - 1
        const isBest = i === maxIdx && !isLast
        const fillColor = isLast ? color : isBest
          ? `color-mix(in srgb, ${color} 90%, transparent)`
          : `color-mix(in srgb, ${color} 45%, transparent)`
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={fillColor} />
            {isBest && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">★</text>
            )}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, delta, icon: Icon, color = 'var(--color-admin)', badge,
}: {
  label: string; value: string; sub?: string
  delta?: { pct: number; up: boolean } | null
  icon: React.ElementType; color?: string; badge?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--color-foreground)] leading-none">{value}</p>
        {sub && <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{sub}</p>}
        {badge && (
          <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
            {badge}
          </span>
        )}
      </div>
      {delta !== undefined && delta !== null && (
        <div className="flex items-center gap-1 text-xs font-medium" style={{ color: delta.up ? 'var(--color-coach)' : 'var(--color-destructive)' }}>
          {delta.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta.pct.toFixed(1)}% vs período anterior
        </div>
      )}
    </div>
  )
}

// ── Table helpers ─────────────────────────────────────────────────────────────
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider whitespace-nowrap">{children}</th>
}
function Td({ children, right, mono, dim }: { children: React.ReactNode; right?: boolean; mono?: boolean; dim?: boolean }) {
  return (
    <td className={[
      'px-3 py-2 text-sm border-b border-[var(--color-border)]',
      right ? 'text-right tabular-nums' : '',
      mono  ? 'font-mono text-xs' : '',
      dim   ? 'text-[var(--color-muted-foreground)]' : 'text-[var(--color-foreground)]',
    ].join(' ')}>
      {children}
    </td>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wider mb-4">{children}</h2>
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-emerald-500/15 text-emerald-400',
    cancelled: 'bg-red-500/15 text-red-400',
    expired:   'bg-amber-500/15 text-amber-400',
    pending:   'bg-blue-500/15 text-blue-400',
    completed: 'bg-emerald-500/15 text-emerald-400',
    approved:  'bg-emerald-500/15 text-emerald-400',
  }
  const cls = map[status?.toLowerCase()] ?? 'bg-gray-500/15 text-gray-400'
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}>
      {status ?? '—'}
    </span>
  )
}

// ── Period filter ─────────────────────────────────────────────────────────────
const PERIODS = [
  { key: '7d',        label: '7 días' },
  { key: '30d',       label: '30 días' },
  { key: '90d',       label: '90 días' },
  { key: '6m',        label: '6 meses' },
  { key: 'ytd',       label: 'Este año' },
  { key: 'last_year', label: 'Año anterior' },
]

function PeriodFilter({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(period: string) {
    router.push(`${pathname}?period=${period}`)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {PERIODS.map(p => {
        const active = current === p.key
        return (
          <button
            key={p.key}
            onClick={() => navigate(p.key)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              active
                ? 'bg-[var(--color-admin)] text-white shadow-sm'
                : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            ].join(' ')}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Detailed tables ───────────────────────────────────────────────────────────
type DetailCache = {
  clients?: DetailedClient[]
  transactions?: DetailedTransaction[]
  subscriptions?: DetailedSubscription[]
  appointments?: DetailedAppointment[]
}

const TAB_CONFIG: { key: DetailTab; label: string; icon: React.ElementType }[] = [
  { key: 'clients',       label: 'Clientes',        icon: Users },
  { key: 'transactions',  label: 'Transacciones',   icon: CreditCard },
  { key: 'subscriptions', label: 'Suscripciones',   icon: RefreshCw },
  { key: 'appointments',  label: 'Citas',            icon: Calendar },
]

function ClientsTable({ rows, currency }: { rows: DetailedClient[]; currency: string }) {
  if (!rows.length) return <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin datos para el período seleccionado</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
            <Th>Nombre</Th>
            <Th>Email</Th>
            <Th>Teléfono</Th>
            <Th>Nivel</Th>
            <Th>Sucursal</Th>
            <Th>Estado</Th>
            <Th>Registro</Th>
            <Th>Ingresos</Th>
            <Th>Suscr.</Th>
            <Th>Act. suscr.</Th>
            <Th>Citas</Th>
            <Th>Citas completas</Th>
            <Th>Mediciones</Th>
            <Th>Últ. cita</Th>
            <Th>Últ. suscr.</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
              <Td><span className="font-medium whitespace-nowrap">{r.full_name || '—'}</span></Td>
              <Td dim mono>{r.email}</Td>
              <Td dim>{r.phone ?? '—'}</Td>
              <Td>{r.client_level ?? '—'}</Td>
              <Td>{r.branch_name ?? '—'}</Td>
              <Td><StatusPill status={r.approval_status} /></Td>
              <Td dim>{fmtDate(r.join_date)}</Td>
              <Td right>{fmt(r.total_revenue, currency)}</Td>
              <Td right>{r.total_subscriptions}</Td>
              <Td right>{r.active_plans}</Td>
              <Td right>{r.total_appointments}</Td>
              <Td right>{r.completed_appointments}</Td>
              <Td right>{r.measurements_count}</Td>
              <Td dim>{fmtDate(r.last_appointment_date)}</Td>
              <Td dim>{fmtDate(r.last_subscription_date)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TransactionsTable({ rows }: { rows: DetailedTransaction[] }) {
  if (!rows.length) return <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin transacciones para el período seleccionado</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
            <Th>N° Factura</Th>
            <Th>Fecha</Th>
            <Th>Cliente</Th>
            <Th>Email</Th>
            <Th>Plan</Th>
            <Th>Ciclo</Th>
            <Th>Monto</Th>
            <Th>Estado</Th>
            <Th>Ref. pago</Th>
            <Th>Promoción</Th>
            <Th>Descuento</Th>
            <Th>ID Stripe suscr.</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
              <Td mono dim>{r.invoice_number ?? '—'}</Td>
              <Td dim>{fmtDate(r.invoice_date)}</Td>
              <Td><span className="font-medium whitespace-nowrap">{r.client_name}</span></Td>
              <Td dim mono>{r.client_email}</Td>
              <Td>{r.plan_name}</Td>
              <Td dim>{r.billing_cycle}</Td>
              <Td right>{fmt(r.amount, r.currency)}</Td>
              <Td><StatusPill status={r.invoice_status} /></Td>
              <Td mono dim>{r.payment_reference ?? '—'}</Td>
              <Td>{r.promotion_title ?? '—'}</Td>
              <Td right dim>{r.discount_applied ?? '—'}</Td>
              <Td mono dim>{r.stripe_subscription_id ?? '—'}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SubscriptionsTable({ rows, currency }: { rows: DetailedSubscription[]; currency: string }) {
  if (!rows.length) return <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin suscripciones para el período seleccionado</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
            <Th>Inicio</Th>
            <Th>Vencimiento</Th>
            <Th>Cliente</Th>
            <Th>Email</Th>
            <Th>Plan</Th>
            <Th>Ciclo</Th>
            <Th>Estado</Th>
            <Th>Monto</Th>
            <Th>Días rest.</Th>
            <Th>Ref. pago</Th>
            <Th>Promoción</Th>
            <Th>ID Stripe</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
              <Td dim>{fmtDate(r.start_date)}</Td>
              <Td dim>{fmtDate(r.end_date)}</Td>
              <Td><span className="font-medium whitespace-nowrap">{r.client_name}</span></Td>
              <Td dim mono>{r.client_email}</Td>
              <Td>{r.plan_name}</Td>
              <Td dim>{r.billing_cycle}</Td>
              <Td><StatusPill status={r.status} /></Td>
              <Td right>{fmt(r.amount, currency)}</Td>
              <Td right dim>{r.days_remaining != null ? r.days_remaining : '—'}</Td>
              <Td mono dim>{r.payment_reference ?? '—'}</Td>
              <Td>{r.promotion_applied ?? '—'}</Td>
              <Td mono dim>{r.stripe_subscription_id ?? '—'}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AppointmentsTable({ rows }: { rows: DetailedAppointment[] }) {
  if (!rows.length) return <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin citas para el período seleccionado</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
            <Th>Fecha/Hora</Th>
            <Th>Fin</Th>
            <Th>Título</Th>
            <Th>Tipo</Th>
            <Th>Estado</Th>
            <Th>Cliente</Th>
            <Th>Email cliente</Th>
            <Th>Coach</Th>
            <Th>Ubicación</Th>
            <Th>Duración (min)</Th>
            <Th>Notas</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
              <Td dim>{fmtDateTime(r.appointment_date)}</Td>
              <Td dim>{fmtDateTime(r.end_time)}</Td>
              <Td>{r.title ?? '—'}</Td>
              <Td dim>{r.appointment_type ?? '—'}</Td>
              <Td><StatusPill status={r.status} /></Td>
              <Td><span className="font-medium whitespace-nowrap">{r.client_name ?? '—'}</span></Td>
              <Td dim mono>{r.client_email ?? '—'}</Td>
              <Td>{r.coach_name ?? '—'}</Td>
              <Td>{r.location ?? '—'}</Td>
              <Td right>{r.duration_minutes ?? '—'}</Td>
              <Td dim><span className="max-w-[200px] truncate block">{r.notes ?? '—'}</span></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function AnalyticsDashboard({ data, period }: { data: AnalyticsData; period: string }) {
  const { summary, kpis, monthlyRevenue, topPlans, topPromotions, topUsers, branches, topVideos, weeklyActivity, currency, from, to } = data
  const [exportPending, startExport] = useTransition()
  const [showExecutive, setShowExecutive] = useState(true)

  // Detail table state
  const [activeTab, setActiveTab] = useState<DetailTab>('clients')
  const [cache, setCache] = useState<DetailCache>({})
  const [tabPending, startTab] = useTransition()
  const [tabError, setTabError] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    if (!showDetail) return
    if (cache[activeTab]) return
    setTabError(null)
    startTab(async () => {
      const result = await getDetailedDataAction(activeTab, from, to)
      if (result.error) { setTabError(result.error); return }
      setCache(prev => ({ ...prev, [activeTab]: result.data as any }))
    })
  }, [activeTab, showDetail, from, to])

  // When period changes, clear cache
  useEffect(() => { setCache({}) }, [from, to])

  function handleExport() {
    startExport(async () => {
      const res = await fetch(`/api/admin/analytics/export?period=${period}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analiticas-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const revenueDelta = pctDelta(kpis.period_revenue, kpis.prev_period_revenue)
  const bestMonth = monthlyRevenue.reduce((best, m) => m.revenue > best.revenue ? m : best, { year_month: '', revenue: 0, count: 0 })
  const bestWeek  = weeklyActivity.reduce((best, w) => w.revenue > best.revenue ? w : best, { year_week: '', revenue: 0, appointments: 0, new_subscriptions: 0 })

  return (
    <div className="mt-6 space-y-6">

      {/* ── Header: period filter + export ──────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PeriodFilter current={period} />
        <button
          onClick={handleExport}
          disabled={exportPending}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-60 shrink-0"
        >
          {exportPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Exportar Excel completo
        </button>
      </div>

      {/* ── Executive KPIs ───────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <button
          onClick={() => setShowExecutive(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[var(--color-muted)] transition-colors"
        >
          <span className="text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground)]">KPIs Ejecutivos</span>
          {showExecutive ? <ChevronUp size={16} className="text-[var(--color-muted-foreground)]" /> : <ChevronDown size={16} className="text-[var(--color-muted-foreground)]" />}
        </button>
        {showExecutive && (
          <div className="border-t border-[var(--color-border)] p-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <KpiCard
              label="Ingresos del período"
              value={fmt(kpis.period_revenue, currency)}
              delta={revenueDelta}
              icon={CreditCard}
              color="var(--color-admin)"
            />
            <KpiCard
              label="MRR"
              value={fmt(kpis.mrr, currency)}
              sub={`ARR: ${fmt(kpis.arr, currency)}`}
              icon={TrendingUp}
              color="var(--color-coach)"
              badge="Ingresos recurrentes mensuales"
            />
            <KpiCard
              label="ARPU"
              value={fmt(kpis.arpu, currency)}
              sub={`Ticket promedio: ${fmt(kpis.avg_subscription_value, currency)}`}
              icon={BarChart2}
              color="#8b5cf6"
              badge="Ingreso por usuario activo"
            />
            <KpiCard
              label="Tasa de cancelación"
              value={`${kpis.churn_rate_pct.toFixed(1)}%`}
              sub={`${kpis.cancelled_subscriptions} cancelaciones en el período`}
              icon={TrendingDown}
              color={kpis.churn_rate_pct > 10 ? 'var(--color-destructive)' : 'var(--color-coach)'}
            />
            <KpiCard
              label="Llenado de citas"
              value={`${kpis.appointment_fill_rate.toFixed(1)}%`}
              sub={`${kpis.completed_appointments} / ${kpis.total_appointments} citas · ${kpis.cancellation_rate.toFixed(1)}% canceladas`}
              icon={Activity}
              color={kpis.appointment_fill_rate >= 70 ? 'var(--color-coach)' : 'var(--color-client)'}
            />
          </div>
        )}
      </div>

      {/* ── Summary KPI cards ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Clientes activos"
          value={summary.total_clients.toString()}
          sub={`+${summary.new_clients_this_month} este mes · ${summary.pending_approvals} pend.`}
          icon={Users}
          color="var(--color-client)"
        />
        <KpiCard
          label="Suscripciones activas"
          value={summary.active_subscriptions.toString()}
          sub={`+${summary.new_subs_this_month} este mes`}
          icon={RefreshCw}
          color="#8b5cf6"
        />
        <KpiCard
          label="Ingresos YTD"
          value={fmt(summary.ytd_revenue, currency)}
          sub={`Este mes: ${fmt(summary.this_month_revenue, currency)}`}
          icon={Target}
          color="var(--color-admin)"
        />
        <KpiCard
          label="Nuevas suscr. en período"
          value={kpis.new_subscriptions.toString()}
          sub={`${kpis.cancelled_subscriptions} canceladas`}
          icon={CreditCard}
          color="var(--color-coach)"
        />
      </div>

      {/* ── Revenue Chart ────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <SectionTitle>Ingresos por mes</SectionTitle>
            <p className="text-xs text-[var(--color-muted-foreground)] -mt-3">Período seleccionado</p>
          </div>
          {bestMonth.revenue > 0 && (
            <div className="text-right">
              <p className="text-xs text-[var(--color-muted-foreground)]">Mejor mes</p>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">{monthLabel(bestMonth.year_month)}</p>
              <p className="text-xs text-[var(--color-coach)]">{fmt(bestMonth.revenue, currency)}</p>
            </div>
          )}
        </div>
        <BarChart
          data={monthlyRevenue.map(m => ({ label: monthLabel(m.year_month), value: m.revenue }))}
          color="var(--color-admin)"
          highlightLast
        />
      </div>

      {/* ── Plans + Branches ─────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]"><SectionTitle>Planes más vendidos</SectionTitle></div>
          {topPlans.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin datos de planes en el período</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]"><Th>#</Th><Th>Plan</Th><Th>Ventas</Th><Th>Ingresos</Th></tr></thead>
                <tbody>
                  {topPlans.map((p, i) => (
                    <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
                      <Td dim><span className="tabular-nums">{i + 1}</span></Td>
                      <Td>{p.plan_name}</Td>
                      <Td right>{p.purchases}</Td>
                      <Td right>{fmt(p.revenue, p.currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]"><SectionTitle>Rendimiento por sucursal</SectionTitle></div>
          {branches.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin sucursales activas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]"><Th>Sucursal</Th><Th>Clientes</Th><Th>Coaches</Th><Th>Citas</Th><Th>Ingresos</Th></tr></thead>
                <tbody>
                  {branches.map((b, i) => (
                    <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
                      <Td>{b.branch_name}</Td>
                      <Td right>{b.clients}</Td>
                      <Td right>{b.coaches}</Td>
                      <Td right>{b.appointments}</Td>
                      <Td right>{fmt(b.revenue, currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Top clients + Videos ─────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]"><SectionTitle>Top clientes por ingresos</SectionTitle></div>
          {topUsers.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin datos de clientes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]"><Th>#</Th><Th>Cliente</Th><Th>Citas</Th><Th>Suscr.</Th><Th>Ingresos</Th></tr></thead>
                <tbody>
                  {topUsers.slice(0, 10).map((u, i) => (
                    <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
                      <Td dim><span className="tabular-nums">{i + 1}</span></Td>
                      <Td><span className="truncate max-w-[160px] block font-medium">{u.full_name || '—'}</span></Td>
                      <Td right>{u.appointments}</Td>
                      <Td right>{u.subscriptions}</Td>
                      <Td right>{fmt(u.revenue, currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]"><SectionTitle>Videos más asignados</SectionTitle></div>
          {topVideos.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin asignaciones de video</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]"><Th>#</Th><Th>Video</Th><Th>Asignaciones</Th></tr></thead>
                <tbody>
                  {topVideos.map((v, i) => (
                    <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
                      <Td dim><span className="tabular-nums">{i + 1}</span></Td>
                      <Td><span className="truncate max-w-[200px] block">{v.video_title}</span></Td>
                      <Td right>{v.assignments}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Weekly charts ────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <SectionTitle>Citas por semana</SectionTitle>
              <p className="text-xs text-[var(--color-muted-foreground)] -mt-3">Período seleccionado</p>
            </div>
            {bestWeek.appointments > 0 && (
              <div className="text-right">
                <p className="text-xs text-[var(--color-muted-foreground)]">Mejor semana</p>
                <p className="text-sm font-semibold">{weekLabel(bestWeek.year_week)}</p>
                <p className="text-xs text-[var(--color-coach)]">{bestWeek.appointments} citas</p>
              </div>
            )}
          </div>
          <BarChart data={weeklyActivity.map(w => ({ label: weekLabel(w.year_week), value: w.appointments }))} color="var(--color-coach)" highlightLast />
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]"><SectionTitle>Promociones utilizadas</SectionTitle></div>
          {topPromotions.filter(p => p.uses > 0).length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin promociones utilizadas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]"><Th>Promoción</Th><Th>Usos</Th><Th>Dto. Prom.</Th></tr></thead>
                <tbody>
                  {topPromotions.filter(p => p.uses > 0).map((p, i) => (
                    <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
                      <Td><span className="truncate max-w-[180px] block">{p.promo_title}</span></Td>
                      <Td right>{p.uses}</Td>
                      <Td right>{fmt(p.avg_discount, currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Detailed data section ────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <button
          onClick={() => setShowDetail(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[var(--color-muted)] transition-colors"
        >
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground)]">Datos Detallados</span>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Todas las columnas disponibles · descargables en Excel</p>
          </div>
          {showDetail
            ? <ChevronUp size={16} className="text-[var(--color-muted-foreground)]" />
            : <ChevronDown size={16} className="text-[var(--color-muted-foreground)]" />}
        </button>

        {showDetail && (
          <div className="border-t border-[var(--color-border)]">
            {/* Tab bar */}
            <div className="flex border-b border-[var(--color-border)] px-4 gap-1 pt-2">
              {TAB_CONFIG.map(t => {
                const Icon = t.icon
                const active = activeTab === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={[
                      'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors',
                      active
                        ? 'border-[var(--color-admin)] text-[var(--color-foreground)] bg-[var(--color-muted)]'
                        : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                    ].join(' ')}
                  >
                    <Icon size={13} />
                    {t.label}
                    {cache[t.key] && (
                      <span className="ml-1 text-[10px] bg-[var(--color-muted)] text-[var(--color-muted-foreground)] px-1.5 py-0.5 rounded-full tabular-nums">
                        {(cache[t.key] as any[]).length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div className="min-h-[200px]">
              {tabPending ? (
                <div className="flex items-center justify-center py-16 gap-2 text-sm text-[var(--color-muted-foreground)]">
                  <Loader2 size={16} className="animate-spin" />
                  Cargando datos…
                </div>
              ) : tabError ? (
                <p className="px-6 py-8 text-sm text-[var(--color-destructive)]">{tabError}</p>
              ) : (
                <>
                  {activeTab === 'clients'       && <ClientsTable       rows={(cache.clients       ?? []) as DetailedClient[]}       currency={currency} />}
                  {activeTab === 'transactions'  && <TransactionsTable  rows={(cache.transactions  ?? []) as DetailedTransaction[]}  />}
                  {activeTab === 'subscriptions' && <SubscriptionsTable rows={(cache.subscriptions ?? []) as DetailedSubscription[]} currency={currency} />}
                  {activeTab === 'appointments'  && <AppointmentsTable  rows={(cache.appointments  ?? []) as DetailedAppointment[]}  />}
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-muted)] flex items-center justify-between">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Mostrando todos los registros del período · Para análisis completo, use Exportar Excel completo
              </p>
              <button
                onClick={handleExport}
                disabled={exportPending}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-admin)] hover:underline disabled:opacity-60"
              >
                {exportPending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Exportar todo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-center">
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Datos en tiempo real · Ingresos calculados sobre suscripciones registradas · MRR basado en suscripciones activas actuales
        </p>
      </div>
    </div>
  )
}
