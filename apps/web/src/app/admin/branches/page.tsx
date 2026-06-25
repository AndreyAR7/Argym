import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { BranchesTable } from '@/components/admin/branches-table'
import { Building2 } from 'lucide-react'

export const metadata = { title: 'Sucursales' }

export default async function BranchesPage() {
  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const [{ data: branches }, { data: branchProfiles }] = await Promise.all([
    supabase
      .from('branches')
      .select('id, name, address, phone, email, is_active')
      .eq('tenant_id', tenantId)
      .order('name'),
    supabase
      .from('profiles')
      .select('branch_id')
      .eq('tenant_id', tenantId)
      .not('branch_id', 'is', null),
  ])

  // Client count per branch
  const countByBranch = (branchProfiles ?? []).reduce<Record<string, number>>((acc, p) => {
    if (p.branch_id) acc[p.branch_id] = (acc[p.branch_id] ?? 0) + 1
    return acc
  }, {})

  const branchList = (branches ?? []).map((b) => ({
    ...b,
    client_count: countByBranch[b.id] ?? 0,
  }))

  const totalClients = branchList.reduce((sum, b) => sum + b.client_count, 0)
  const activeBranches = branchList.filter((b) => b.is_active).length

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Sucursales"
        subtitle={`${activeBranches} activa${activeBranches !== 1 ? 's' : ''} · ${totalClients} clientes asignados`}
      />

      {/* Summary cards */}
      {branchList.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Total sucursales</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{branchList.length}</p>
          </div>
          <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Sucursales activas</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--color-admin)' }}>{activeBranches}</p>
          </div>
          <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Clientes asignados</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{totalClients}</p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <BranchesTable branches={branchList} />
      </div>
    </div>
  )
}
