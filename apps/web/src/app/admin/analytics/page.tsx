import { getAnalyticsDataAction } from './actions'
import { AnalyticsDashboard } from './analytics-dashboard'
import { PageHeader } from '@/components/shared/page-header'

export const metadata = { title: 'Analíticas' }

export default async function AnalyticsPage() {
  const { data, error } = await getAnalyticsDataAction()

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Analíticas"
        subtitle="Métricas de productividad y rentabilidad del negocio"
      />
      {error ? (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
          No se pudieron cargar las métricas: {error}
        </div>
      ) : data ? (
        <AnalyticsDashboard data={data} />
      ) : null}
    </div>
  )
}
