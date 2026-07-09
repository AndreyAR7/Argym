import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { ApprovalRow } from '@/components/admin/approval-row'
import { ApprovalsTabs } from '@/components/admin/approvals-tabs'
import { ShieldCheck } from 'lucide-react'

export const metadata = { title: 'Aprobaciones' }

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const params = await searchParams
  const statusFilter = (params.status ?? 'pending') as 'pending' | 'approved' | 'rejected'
  const q = params.q ?? ''

  const session = await getSessionData()
  const { supabase, user } = session!

  // Use SECURITY DEFINER RPCs — they bypass RLS and are tenant-isolated inside the function.
  // Direct SELECT on profiles is subject to RLS edge cases (see migration 000011 comment).
  const [{ data: users }, { data: countRows }] = await Promise.all([
    supabase.rpc('get_users_by_approval_status', { p_status: statusFilter }),
    supabase.rpc('get_approval_status_counts'),
  ])

  const counts = { pending: 0, approved: 0, rejected: 0 }
  for (const row of countRows ?? []) {
    const s = row.status as 'pending' | 'approved' | 'rejected'
    if (s in counts) counts[s] = Number(row.cnt)
  }

  const usersFiltered = q
    ? (users ?? []).filter((u: any) =>
        u.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        u.email?.toLowerCase().includes(q.toLowerCase()),
      )
    : (users ?? [])

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <PageHeader
        title="Aprobaciones de usuarios"
        subtitle="Gestiona el acceso a la plataforma"
      />

      {/* ── Tabs ── */}
      <div className="mt-6">
        <ApprovalsTabs current={statusFilter} counts={counts} />
      </div>

      {/* ── Search ── */}
      <div className="mt-4">
        <SearchInput placeholder="Buscar por nombre o correo..." className="max-w-sm" />
      </div>

      {/* ── List ── */}
      <div className="mt-3">
        {usersFiltered.length > 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
            {usersFiltered.map((u: any) => (
              <ApprovalRow
                key={u.id}
                userId={u.id}
                fullName={u.full_name ?? 'Sin nombre'}
                avatarUrl={u.avatar_url ?? null}
                approvalStatus={u.approval_status}
                rejectionReason={u.rejection_reason ?? null}
                createdAt={u.created_at}
                currentAdminId={user!.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-[var(--color-border)]">
            <ShieldCheck size={36} className="text-emerald-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {statusFilter === 'pending'
                  ? 'No hay solicitudes pendientes'
                  : statusFilter === 'approved'
                  ? 'No hay usuarios aprobados'
                  : 'No hay usuarios rechazados'}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                {statusFilter === 'pending'
                  ? 'Todas las solicitudes han sido procesadas'
                  : 'Usa los filtros para ver otros estados'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
