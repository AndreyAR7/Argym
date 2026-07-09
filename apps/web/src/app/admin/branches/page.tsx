import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Building2 } from 'lucide-react'
import { NewBranchButton } from '@/components/admin/new-branch-button'
import { BranchesListClient } from '@/components/admin/branches-list-client'

export const metadata = { title: 'Sucursales' }

export default async function BranchesPage() {
  const supabase = await createClient()
  const { data: branches } = await supabase.rpc('get_branches_with_stats')

  const count = branches?.length ?? 0

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Sucursales" subtitle={`${count} sucursal${count !== 1 ? 'es' : ''}`}>
        <NewBranchButton />
      </PageHeader>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Building2 size={40} className="text-[var(--color-border)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Sin sucursales</p>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5 max-w-sm">
              Crea una sucursal para organizar tus clientes y coaches por sede.
            </p>
          </div>
        </div>
      ) : (
        <BranchesListClient branches={branches ?? []} />
      )}
    </div>
  )
}
