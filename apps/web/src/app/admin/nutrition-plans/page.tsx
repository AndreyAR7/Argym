import { getSessionData } from '@/lib/auth/session'
import { NutritionPageClient } from '@/components/admin/nutrition-page-client'
import Link from 'next/link'

export const metadata = { title: 'Planes Nutricionales' }

const STATUS_TABS = [
  { value: 'all',       label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'draft',     label: 'Borrador' },
  { value: 'archived',  label: 'Archivados' },
]

export default async function NutritionPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const statusFilter = params.status ?? 'all'

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  let query = supabase
    .from('nutrition_plans')
    .select('id, name, description, calories_target, protein_g, carbs_g, fat_g, goal, status, is_template, created_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (statusFilter !== 'all') query = query.eq('status', statusFilter)

  const { data: plans, count } = await query

  return (
    <div className="p-4 md:p-8">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-foreground)] tracking-tight">
          Planes Nutricionales
        </h1>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
          {count ?? 0} plan{count !== 1 ? 'es' : ''} creados
        </p>
      </div>

      {/* ── Status tabs ── */}
      <div className="flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 overflow-x-auto mb-4">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/admin/nutrition-plans' : `/admin/nutrition-plans?status=${tab.value}`}
            className={`px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
              statusFilter === tab.value
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* ── Table + button + modal (client-side) ── */}
      <NutritionPageClient plans={plans ?? []} />
    </div>
  )
}
