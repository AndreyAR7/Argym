import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth/session'
import { SearchInput } from '@/components/shared/search-input'
import { Pagination } from '@/components/shared/pagination'
import { Plus, Circle } from 'lucide-react'

export const metadata = { title: 'Gimnasios — ARGYM HQ' }

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const PAGE_SIZE = 20

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const q    = params.q ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1'))

  const session = await getSessionData()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/')

  const db = adminClient()

  // Fetch all tenants
  const { data: tenants, error } = await db
    .from('tenants')
    .select('id, name, slug, is_active, created_at, timezone, locale')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[super-admin/tenants]', error)
  }

  // Fetch profile counts per tenant in one query
  const { data: profileCounts } = await db
    .from('profiles')
    .select('tenant_id')

  const countMap: Record<string, number> = {}
  for (const p of profileCounts ?? []) {
    countMap[p.tenant_id] = (countMap[p.tenant_id] ?? 0) + 1
  }

  // Fetch platform subscription per tenant (all statuses)
  const { data: subscriptions } = await db
    .from('tenant_subscriptions')
    .select('tenant_id, status, billing_cycle, current_period_end, subscription_plans(name)')

  type SubInfo = { planName: string; status: string; periodEnd: string | null }
  const subMap: Record<string, SubInfo> = {}
  for (const s of subscriptions ?? []) {
    subMap[s.tenant_id] = {
      planName:  (s.subscription_plans as any)?.name ?? '—',
      status:    s.status,
      periodEnd: s.current_period_end ?? null,
    }
  }

  const SUB_STATUS: Record<string, { label: string; color: string }> = {
    active:    { label: 'Activo',   color: '#22c55e' },
    trialing:  { label: 'Prueba',   color: '#60a5fa' },
    past_due:  { label: 'Vencido',  color: '#f97316' },
    cancelled: { label: 'Cancelado',color: '#525252' },
    expired:   { label: 'Expirado', color: '#525252' },
  }

  const allRows = tenants ?? []
  const filtered = q
    ? allRows.filter(t => t.name.toLowerCase().includes(q.toLowerCase()) || t.slug.toLowerCase().includes(q.toLowerCase()))
    : allRows
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#f0f0f0' }}>Gimnasios</h1>
          <p className="text-sm mt-0.5" style={{ color: '#737373' }}>
            {filtered.length} {filtered.length === 1 ? 'tenant registrado' : 'tenants registrados'}
          </p>
        </div>
        <Link
          href="/super-admin/tenants/new"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all"
          style={{ background: '#f97316', color: '#fff' }}
        >
          <Plus size={14} />
          Nuevo gimnasio
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput placeholder="Buscar por nombre o slug..." className="max-w-xs" />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#1f1f1f' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#111111', borderBottom: '1px solid #1f1f1f' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#525252' }}>
                  Gimnasio
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#525252' }}>
                  Slug
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#525252' }}>
                  Plan
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: '#525252' }}>
                  Miembros
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#525252' }}>
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: '#525252' }}>
                  Creado
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: '#525252' }}>
                    No hay gimnasios registrados aún.
                  </td>
                </tr>
              )}
              {rows.map((tenant, i) => (
                <tr
                  key={tenant.id}
                  style={{
                    borderBottom: i < rows.length - 1 ? '1px solid #1a1a1a' : 'none',
                    background: '#0d0d0d',
                  }}
                >
                  {/* Name */}
                  <td className="px-4 py-3.5">
                    <span className="font-medium" style={{ color: '#e5e5e5' }}>
                      {tenant.name}
                    </span>
                  </td>

                  {/* Slug */}
                  <td className="px-4 py-3.5">
                    <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1a1a1a', color: '#a3a3a3', fontFamily: 'monospace' }}>
                      {tenant.slug}
                    </code>
                  </td>

                  {/* Plan + subscription status */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    {subMap[tenant.id] ? (
                      <div className="flex flex-col gap-0.5">
                        <span style={{ color: '#a3a3a3' }}>{subMap[tenant.id].planName}</span>
                        <span
                          className="text-xs"
                          style={{ color: (SUB_STATUS[subMap[tenant.id].status] ?? SUB_STATUS.expired).color }}
                        >
                          {(SUB_STATUS[subMap[tenant.id].status] ?? { label: subMap[tenant.id].status }).label}
                          {subMap[tenant.id].periodEnd && (
                            <span style={{ color: '#525252' }}>
                              {' · vence '}
                              {new Date(subMap[tenant.id].periodEnd!).toLocaleDateString('es-CR', {
                                day: '2-digit', month: 'short',
                              })}
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#3a3a3a' }}>Sin plan</span>
                    )}
                  </td>

                  {/* Members */}
                  <td className="px-4 py-3.5 text-right hidden sm:table-cell tabular-nums" style={{ color: '#a3a3a3' }}>
                    {countMap[tenant.id] ?? 0}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <Circle
                        size={6}
                        fill={tenant.is_active ? '#22c55e' : '#525252'}
                        className="flex-shrink-0"
                        style={{ color: tenant.is_active ? '#22c55e' : '#525252' }}
                      />
                      <span style={{ color: tenant.is_active ? '#22c55e' : '#525252' }}>
                        {tenant.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </span>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3.5 hidden lg:table-cell text-xs tabular-nums" style={{ color: '#525252' }}>
                    {new Date(tenant.created_at).toLocaleDateString('es-CR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/super-admin/tenants/${tenant.id}`}
                      className="text-xs transition-colors hover:underline underline-offset-2"
                      style={{ color: '#f97316' }}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination total={filtered.length} pageSize={PAGE_SIZE} currentPage={page} />
    </div>
  )
}
