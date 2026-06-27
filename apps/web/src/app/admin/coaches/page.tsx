import { getSessionData } from '@/lib/auth/session'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/page-header'
import { ClientRowActions } from '@/components/admin/client-row-actions'
import { CoachFilters } from '@/components/admin/coach-filters'
import { formatDate } from '@/lib/utils'
import { UserPlus, Users2 } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Coaches' }

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; branch?: string }>
}) {
  const params = await searchParams
  const search = params.search ?? ''
  const status = params.status ?? 'approved'
  const branchFilter = params.branch ?? 'all'

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Get coach user IDs
  const { data: coachRoleIds } = await supabase
    .from('user_roles')
    .select('user_id, roles!inner(name)')
    .eq('tenant_id', tenantId)
    .eq('roles.name', 'coach')

  const coachIds = (coachRoleIds ?? []).map((r: any) => r.user_id)

  let query = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, phone, is_active, approval_status, created_at, branch_id', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .in('id', coachIds.length > 0 ? coachIds : ['00000000-0000-0000-0000-000000000000'])

  if (search) query = query.ilike('full_name', `%${search}%`)
  if (status !== 'all') query = query.eq('approval_status', status)
  if (branchFilter !== 'all') query = query.eq('branch_id', branchFilter)

  const { data: coaches, count } = await query.order('full_name', { ascending: true })

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Coaches" subtitle={`${count ?? 0} coaches registrados`}>
        <Link
          href="/admin/coaches/new"
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
        >
          <UserPlus size={14} />
          Nuevo coach
        </Link>
      </PageHeader>

      {/* Search & Filter */}
      <CoachFilters
        defaultSearch={search}
        defaultStatus={status}
        defaultBranch={branchFilter}
        branches={branches ?? []}
      />

      {/* Table */}
      <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Coach</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Teléfono</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Sucursal</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Miembro desde</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {coaches && coaches.length > 0 ? (
              coaches.map((coach) => (
                <tr key={coach.id} className="hover:bg-[var(--color-muted)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={coach.full_name ?? '?'} src={coach.avatar_url} size="sm" className="bg-[var(--color-coach-light)]" />
                      <p className="font-medium text-[var(--color-foreground)]">{coach.full_name ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)] hidden md:table-cell">
                    {coach.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={coach.is_active === false ? 'inactive' : coach.approval_status ?? 'pending'} />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)] hidden md:table-cell">
                    {(branches ?? []).find((b: { id: string; name: string }) => b.id === (coach as any).branch_id)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-muted-foreground)] hidden lg:table-cell">
                    {formatDate(coach.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ClientRowActions
                      clientId={coach.id}
                      clientName={coach.full_name ?? ''}
                      isActive={coach.is_active !== false}
                      clientLevel={null}
                      plans={[]}
                      tenantId={tenantId}
                      branchId={(coach as any).branch_id ?? null}
                      branches={branches ?? []}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Users2 size={32} className="text-[var(--color-border)]" />
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {search ? `Sin resultados para "${search}"` : 'No hay coaches registrados'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
