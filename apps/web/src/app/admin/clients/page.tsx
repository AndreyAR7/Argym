import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { ClientFilters } from '@/components/admin/client-filters'
import { ClientRowActions } from '@/components/admin/client-row-actions'
import { PageHeader } from '@/components/shared/page-header'
import { formatDate } from '@/lib/utils'
import { UserPlus, Users, HeartPulse } from 'lucide-react'

export const metadata = { title: 'Clientes' }

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const PAGE_SIZE = 20

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; level?: string; status?: string; page?: string; branch?: string; medical?: string }>
}) {
  const params = await searchParams
  const search  = params.search  ?? ''
  const level   = params.level   ?? 'all'
  const status  = params.status  ?? 'approved'
  const branch  = params.branch  ?? 'all'
  const medicalPendingOnly = params.medical === 'pending'
  const page    = Math.max(1, parseInt(params.page ?? '1'))
  const offset  = (page - 1) * PAGE_SIZE

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  // ── Fetch branches for filter dropdown ──
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // ── Get client IDs ──
  // get_profiles_by_role INNER JOINs user_roles, which is only populated once
  // an admin approves someone — a self-registered user sitting in
  // pending/rejected has no user_roles row yet and would otherwise never
  // show up here, in any status tab. Union in profiles.requested_role
  // ('client', set at signup by handle_new_user) to also catch those.
  const [{ data: clientProfiles }, { data: selfRegisteredClients }] = await Promise.all([
    supabase.rpc('get_profiles_by_role', { role_name: 'client' }),
    supabase.from('profiles').select('id').eq('tenant_id', tenantId).eq('requested_role', 'client'),
  ])
  let clientIds = Array.from(new Set([
    ...(clientProfiles ?? []).map((p: any) => p.id as string),
    ...(selfRegisteredClients ?? []).map((p: any) => p.id as string),
  ]))

  const { data: medicalRecords } = await supabase
    .from('client_medical_records')
    .select('client_id, status')
    .eq('tenant_id', tenantId)
  const medicalStatusMap = new Map((medicalRecords ?? []).map((m: any) => [m.client_id as string, m.status as string]))

  if (medicalPendingOnly) {
    clientIds = clientIds.filter((id) => medicalStatusMap.get(id) !== 'completed')
  }

  // ── Build client query ──
  let clientQuery = supabase
    .from('profiles')
    .select(`
      id, full_name, avatar_url, phone, client_level,
      is_active, approval_status, suspension_reason, created_at, branch_id,
      user_subscriptions(
        id, status, final_price,
        plans(id, name, price, currency, plan_tier, grants_physical_access)
      )
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .in('id', clientIds.length > 0 ? clientIds : ['00000000-0000-0000-0000-000000000000'])

  if (search) clientQuery = clientQuery.ilike('full_name', `%${search}%`)
  if (level !== 'all') {
    if (level === 'none') clientQuery = clientQuery.is('client_level', null)
    else clientQuery = clientQuery.eq('client_level', level)
  }
  if (status === 'suspended') {
    clientQuery = clientQuery.eq('is_active', false).eq('suspension_reason', 'non_payment')
  } else if (status !== 'all') {
    clientQuery = clientQuery.eq('approval_status', status)
  }
  if (branch !== 'all') clientQuery = clientQuery.eq('branch_id', branch)
  clientQuery = clientQuery.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1)

  const [{ data: clients, count }, { data: plans }] = await Promise.all([
    clientQuery,
    supabase
      .from('plans')
      .select('id, name, price, currency, billing_cycle, plan_tier')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Clientes" subtitle={`${count ?? 0} clientes en total`}>
        <Link
          href="/admin/clients/new"
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
        >
          <UserPlus size={14} />
          Nuevo cliente
        </Link>
      </PageHeader>

      {/* ── Filters ── */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ClientFilters
          defaultSearch={search}
          defaultLevel={level}
          defaultStatus={status}
          defaultBranch={branch}
          branches={branches ?? []}
        />
        <Link
          href={buildUrl(params, { medical: medicalPendingOnly ? '' : 'pending' })}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${
            medicalPendingOnly
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
              : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]'
          }`}
        >
          <HeartPulse size={13} />
          Ficha médica pendiente
        </Link>
      </div>

      {/* ── Table ── */}
      <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">
                Nivel
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">
                Plan activo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">
                Sucursal
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden xl:table-cell">
                Miembro desde
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {clients && clients.length > 0 ? (
              clients.map((client) => {
                const activeSub = (client.user_subscriptions as any[])?.find(
                  (s) => s.status === 'active',
                )
                const plan = activeSub?.plans
                const lapsedGymSub = (client.user_subscriptions as any[])?.find(
                  (s) => s.status === 'expired' && s.plans?.grants_physical_access,
                )

                return (
                  <tr key={client.id} className="hover:bg-[var(--color-muted)] transition-colors">
                    {/* Name + avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.full_name ?? '?'} src={client.avatar_url} size="sm" />
                        <div>
                          <p className="font-medium text-[var(--color-foreground)] flex items-center gap-1.5">
                            {client.full_name ?? '—'}
                            {medicalStatusMap.get(client.id) !== 'completed' && (
                              <HeartPulse size={12} className="text-amber-500" aria-label="Ficha médica pendiente" />
                            )}
                          </p>
                          {client.phone && (
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              {client.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Level */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {client.client_level ? (
                        <Badge value={client.client_level} />
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {plan ? (
                        <div>
                          <p className="text-sm text-[var(--color-foreground)]">{plan.name}</p>
                          {activeSub?.final_price != null && (
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              {plan.currency} {Number(activeSub.final_price).toLocaleString('es-CR')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">Sin plan</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge value={
                        client.is_active === false
                          ? (client.suspension_reason === 'non_payment' ? 'suspended' : 'inactive')
                          : (client.approval_status ?? 'pending')
                      } />
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-3 text-sm text-[var(--color-muted-foreground)] hidden md:table-cell">
                      {(branches ?? []).find((b) => b.id === (client as any).branch_id)?.name ?? '—'}
                    </td>

                    {/* Member since */}
                    <td className="px-4 py-3 text-sm text-[var(--color-muted-foreground)] hidden xl:table-cell">
                      {formatDate(client.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <ClientRowActions
                        clientId={client.id}
                        clientName={client.full_name ?? ''}
                        isActive={client.is_active !== false}
                        clientLevel={client.client_level ?? null}
                        plans={plans ?? []}
                        tenantId={tenantId}
                        branchId={(client as any).branch_id ?? null}
                        branches={branches ?? []}
                        activePlanName={plan?.name ?? null}
                        suspensionReason={client.suspension_reason ?? null}
                        lapsedSubscriptionId={lapsedGymSub?.id ?? null}
                      />
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Users size={32} className="text-[var(--color-border)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        No se encontraron clientes
                      </p>
                      <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                        {search ? `Sin resultados para "${search}"` : 'Ajusta los filtros o agrega clientes nuevos'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-[var(--color-muted-foreground)]">
            Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, count ?? 0)} de {count ?? 0} clientes
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={buildUrl(params, { page: String(p) })}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function buildUrl(
  current: Record<string, string | undefined>,
  overrides: Record<string, string>,
) {
  const params = new URLSearchParams()
  const merged = { ...current, ...overrides }
  Object.entries(merged).forEach(([k, v]) => {
    if (v && v !== 'all' && v !== '1') params.set(k, v)
  })
  const qs = params.toString()
  return `/admin/clients${qs ? `?${qs}` : ''}`
}
