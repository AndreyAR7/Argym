'use client'

import { useState, useTransition } from 'react'
import { Download, TrendingUp, TrendingDown, Users, CreditCard, RefreshCw, Loader2 } from 'lucide-react'
import type { AnalyticsData } from './actions'

// ── Helpers ──────────────────────────────────────────────────────
function fmt(n: number, currency = 'CRC') {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${currency} ${(n / 1_000).toFixed(1)}K`
  return `${currency} ${n.toLocaleString('es-CR', { minimumFractionDigits: 0 })}`
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

// ── Inline SVG Bar Chart ─────────────────────────────────────────
function BarChart({
  data,
  valueFormatter = (v: number) => v.toLocaleString(),
  color = 'var(--color-admin)',
  highlightLast = true,
}: {
  data: { label: string; value: number }[]
  valueFormatter?: (v: number) => string
  color?: string
  highlightLast?: boolean
}) {
  if (!data.length) return <p className="text-xs text-[var(--color-muted-foreground)] py-4 text-center">Sin datos</p>

  const maxVal = Math.max(...data.map(d => d.value), 1)
  const W = 600
  const H = 180
  const labelH = 28
  const chartH = H - labelH
  const barW = Math.floor((W / data.length) * 0.6)
  const gap   = (W / data.length) - barW

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ overflow: 'visible' }}>
      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => {
        const y = chartH - chartH * f
        return (
          <line key={f} x1={0} x2={W} y1={y} y2={y}
            stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 3" />
        )
      })}

      {data.map((d, i) => {
        const barH = Math.max((d.value / maxVal) * chartH, d.value > 0 ? 2 : 0)
        const x = i * (W / data.length) + gap / 2
        const y = chartH - barH
        const isLast = highlightLast && i === data.length - 1
        const fillColor = isLast ? color : `color-mix(in srgb, ${color} 55%, transparent)`

        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3}
              fill={fillColor} />
            {i === data.indexOf(data.reduce((a, b) => a.value > b.value ? a : b)) && !isLast && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={9}
                fill="var(--color-muted-foreground)">★</text>
            )}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={9}
              fill="var(--color-muted-foreground)">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, delta, icon: Icon, color = 'var(--color-admin)',
}: {
  label: string
  value: string
  sub?: string
  delta?: { pct: number; up: boolean } | null
  icon: React.ElementType
  color?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--color-foreground)] leading-none">{value}</p>
        {sub && <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{sub}</p>}
      </div>
      {delta !== undefined && delta !== null && (
        <div className="flex items-center gap-1 text-xs font-medium"
          style={{ color: delta.up ? 'var(--color-coach)' : 'var(--color-destructive)' }}>
          {delta.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta.pct.toFixed(1)}% vs mes anterior
        </div>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wider mb-4">{children}</h2>
  )
}

// ── Table helpers ─────────────────────────────────────────────────
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
      {children}
    </th>
  )
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={`px-4 py-2.5 text-sm text-[var(--color-foreground)] ${right ? 'text-right tabular-nums' : ''}`}>
      {children}
    </td>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────
export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const { summary, monthlyRevenue, topPlans, topPromotions, topUsers, branches, topVideos, weeklyActivity, currency } = data
  const [isPending, startTransition] = useTransition()

  const revenueDelta = pctDelta(summary.this_month_revenue, summary.last_month_revenue)

  function handleExport() {
    startTransition(async () => {
      const res = await fetch('/api/admin/analytics/export')
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${new Date().toISOString().slice(0,10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  // Best week
  const bestWeek = weeklyActivity.reduce(
    (best, w) => w.revenue > best.revenue ? w : best,
    { year_week: '', revenue: 0, appointments: 0, new_subscriptions: 0 }
  )
  // Best month from monthly data
  const bestMonth = monthlyRevenue.reduce(
    (best, m) => m.revenue > best.revenue ? m : best,
    { year_month: '', revenue: 0, count: 0 }
  )

  return (
    <div className="mt-6 space-y-8">

      {/* ── Download Button ────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-60"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Descargar reporte Excel
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos del mes"
          value={fmt(summary.this_month_revenue, currency)}
          sub={`Acumulado anual: ${fmt(summary.ytd_revenue, currency)}`}
          delta={revenueDelta}
          icon={CreditCard}
          color="var(--color-admin)"
        />
        <KpiCard
          label="Ingresos totales"
          value={fmt(summary.total_revenue, currency)}
          sub={`${summary.active_subscriptions} suscripciones activas`}
          icon={TrendingUp}
          color="var(--color-coach)"
        />
        <KpiCard
          label="Clientes activos"
          value={summary.total_clients.toString()}
          sub={`+${summary.new_clients_this_month} este mes`}
          icon={Users}
          color="var(--color-client)"
        />
        <KpiCard
          label="Nuevas suscripciones"
          value={summary.new_subs_this_month.toString()}
          sub={`${summary.pending_approvals} pendientes de aprobación`}
          icon={RefreshCw}
          color="#8b5cf6"
        />
      </div>

      {/* ── Revenue Chart ──────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <SectionTitle>Ingresos por mes</SectionTitle>
            <p className="text-xs text-[var(--color-muted-foreground)] -mt-3">Últimos 13 meses</p>
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
          valueFormatter={v => fmt(v, currency)}
          color="var(--color-admin)"
          highlightLast
        />
      </div>

      {/* ── Plans + Branches ────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Plans */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <SectionTitle>Planes más vendidos</SectionTitle>
          </div>
          {topPlans.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin datos de planes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <Th>Plan</Th>
                    <Th>Ventas</Th>
                    <Th>Ingresos</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {topPlans.slice(0, 8).map((p, i) => (
                    <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-4 text-[var(--color-muted-foreground)] tabular-nums">{i + 1}</span>
                          {p.plan_name}
                        </div>
                      </Td>
                      <Td right>{p.purchases}</Td>
                      <Td right>{fmt(p.revenue, p.currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Branch Performance */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <SectionTitle>Rendimiento por sucursal</SectionTitle>
          </div>
          {branches.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin sucursales activas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <Th>Sucursal</Th>
                    <Th>Clientes</Th>
                    <Th>Citas</Th>
                    <Th>Ingresos</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {branches.map((b, i) => (
                    <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-4 text-[var(--color-muted-foreground)] tabular-nums">{i + 1}</span>
                          {b.branch_name}
                        </div>
                      </Td>
                      <Td right>{b.clients}</Td>
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

      {/* ── Top Users + Top Videos ──────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Active Users */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <SectionTitle>Top clientes por ingresos</SectionTitle>
          </div>
          {topUsers.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin datos de clientes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <Th>Cliente</Th>
                    <Th>Citas</Th>
                    <Th>Ingresos</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {topUsers.slice(0, 10).map((u, i) => (
                    <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-4 text-[var(--color-muted-foreground)] tabular-nums">{i + 1}</span>
                          <span className="truncate max-w-[160px]">{u.full_name || '—'}</span>
                        </div>
                      </Td>
                      <Td right>{u.appointments}</Td>
                      <Td right>{fmt(u.revenue, currency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Videos */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <SectionTitle>Videos más asignados</SectionTitle>
          </div>
          {topVideos.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin asignaciones de video</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <Th>#</Th>
                    <Th>Video</Th>
                    <Th>Asignaciones</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {topVideos.map((v, i) => (
                    <tr key={i} className="hover:bg-[var(--color-muted)] transition-colors">
                      <Td><span className="text-[var(--color-muted-foreground)]">{i + 1}</span></Td>
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

      {/* ── Weekly Chart + Promotions ───────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <SectionTitle>Actividad semanal</SectionTitle>
              <p className="text-xs text-[var(--color-muted-foreground)] -mt-3">Citas agendadas — últimas 12 semanas</p>
            </div>
            {bestWeek.appointments > 0 && (
              <div className="text-right">
                <p className="text-xs text-[var(--color-muted-foreground)]">Mejor semana</p>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">{weekLabel(bestWeek.year_week)}</p>
                <p className="text-xs text-[var(--color-coach)]">{bestWeek.appointments} citas</p>
              </div>
            )}
          </div>
          <BarChart
            data={weeklyActivity.map(w => ({ label: weekLabel(w.year_week), value: w.appointments }))}
            color="var(--color-coach)"
            highlightLast
          />
        </div>

        {/* Promotions */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <SectionTitle>Promociones utilizadas</SectionTitle>
          </div>
          {topPromotions.filter(p => p.uses > 0).length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--color-muted-foreground)]">Sin promociones utilizadas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <Th>Promoción</Th>
                    <Th>Usos</Th>
                    <Th>Dto. Prom.</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
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

      {/* ── Revenue weekly chart ────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <SectionTitle>Ingresos por semana</SectionTitle>
            <p className="text-xs text-[var(--color-muted-foreground)] -mt-3">Últimas 12 semanas</p>
          </div>
          {bestWeek.revenue > 0 && (
            <div className="text-right">
              <p className="text-xs text-[var(--color-muted-foreground)]">Semana más rentable</p>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">{weekLabel(bestWeek.year_week)}</p>
              <p className="text-xs text-[var(--color-admin)]">{fmt(bestWeek.revenue, currency)}</p>
            </div>
          )}
        </div>
        <BarChart
          data={weeklyActivity.map(w => ({ label: weekLabel(w.year_week), value: w.revenue }))}
          valueFormatter={v => fmt(v, currency)}
          color="#8b5cf6"
          highlightLast
        />
      </div>

      {/* ── Summary footer ──────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-center">
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Datos actualizados en tiempo real · Los ingresos se calculan sobre suscripciones registradas en el sistema
        </p>
      </div>
    </div>
  )
}
