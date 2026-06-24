import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { ApprovalRow } from '@/components/admin/approval-row'
import { ApprovalsTabs } from '@/components/admin/approvals-tabs'
import { formatDate } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'

export const metadata = { title: 'Aprobaciones' }

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const statusFilter = (params.status ?? 'pending') as 'pending' | 'approved' | 'rejected'

  const session = await getSessionData()
  const { supabase, user, tenantId } = session!

  // ── Counts for each tab ──
  const [{ count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('approval_status', 'pending'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('approval_status', 'approved'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('approval_status', 'rejected'),
    ])

  // ── Users for current tab ──
  const { data: users } = await supabase
    .from('profiles')
    .select(`
      id, full_name, avatar_url, approval_status,
      rejection_reason, created_at, updated_at
    `)
    .eq('tenant_id', tenantId)
    .eq('approval_status', statusFilter)
    .order('created_at', { ascending: statusFilter === 'pending' })
    .limit(50)

  // ── Get emails from auth (via supabase admin) — approximate via profiles ──
  // Note: profiles don't store email directly; we'd need supabase admin API for that
  // For now we show available info

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <PageHeader
        title="Aprobaciones de usuarios"
        subtitle="Gestiona el acceso a la plataforma"
      />

      {/* ── Tabs ── */}
      <div className="mt-6">
        <ApprovalsTabs
          current={statusFilter}
          counts={{ pending: pendingCount ?? 0, approved: approvedCount ?? 0, rejected: rejectedCount ?? 0 }}
        />
      </div>

      {/* ── List ── */}
      <div className="mt-4">
        {users && users.length > 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
            {users.map((u) => (
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
