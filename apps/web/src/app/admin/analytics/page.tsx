import { getAnalyticsDataAction } from './actions'
import { AnalyticsDashboard } from './analytics-dashboard'
import { PageHeader } from '@/components/shared/page-header'

export const metadata = { title: 'Analíticas' }

const PERIOD_LABELS: Record<string, string> = {
  '7d':        'Últimos 7 días',
  '30d':       'Últimos 30 días',
  '90d':       'Últimos 90 días',
  '6m':        'Últimos 6 meses',
  'ytd':       'Este año',
  'last_year': 'Año anterior',
}

function computeRange(period: string, customFrom?: string, customTo?: string): { from: string; to: string } {
  if (period === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo }
  }
  const now = new Date()
  const to = now.toISOString()
  switch (period) {
    case '7d': {
      const d = new Date(now); d.setDate(d.getDate() - 7)
      return { from: d.toISOString(), to }
    }
    case '90d': {
      const d = new Date(now); d.setDate(d.getDate() - 90)
      return { from: d.toISOString(), to }
    }
    case '6m': {
      const d = new Date(now); d.setMonth(d.getMonth() - 6)
      return { from: d.toISOString(), to }
    }
    case 'ytd': {
      return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to }
    }
    case 'last_year': {
      const y = now.getFullYear() - 1
      return {
        from: new Date(y, 0, 1).toISOString(),
        to:   new Date(y, 11, 31, 23, 59, 59).toISOString(),
      }
    }
    default: {
      // 30d
      const d = new Date(now); d.setDate(d.getDate() - 30)
      return { from: d.toISOString(), to }
    }
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const period = params.period ?? '30d'
  const { from, to } = computeRange(period, params.from, params.to)

  const { data, error } = await getAnalyticsDataAction(from, to)

  const periodLabel = PERIOD_LABELS[period] ?? 'Últimos 30 días'

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Analíticas"
        subtitle={`Métricas ejecutivas de rentabilidad · ${periodLabel}`}
      />
      {error ? (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
          No se pudieron cargar las métricas: {error}
        </div>
      ) : data ? (
        <AnalyticsDashboard data={data} period={period} />
      ) : null}
    </div>
  )
}
