import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Building2, MapPin, Phone, Mail, Users2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BranchActions } from '@/components/admin/branch-actions'
import { NewBranchButton } from '@/components/admin/new-branch-button'
import { formatDate } from '@/lib/utils'

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

      <div className="mt-6">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {branches?.map((branch: any) => (
              <div key={branch.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3">

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-[var(--color-foreground)]">{branch.name}</span>
                    <Badge value={branch.is_active ? 'approved' : 'inactive'} />
                  </div>
                  <BranchActions branch={branch} />
                </div>

                {/* Contact info */}
                <div className="space-y-1">
                  {branch.address && (
                    <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                      <MapPin size={13} className="shrink-0" />
                      {branch.address}
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                      <Phone size={13} className="shrink-0" />
                      {branch.phone}
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                      <Mail size={13} className="shrink-0" />
                      {branch.email}
                    </div>
                  )}
                  {!branch.address && !branch.phone && !branch.email && (
                    <p className="text-xs text-[var(--color-muted-foreground)] italic">Sin información de contacto</p>
                  )}
                </div>

                {/* User counts */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-coach-light)', color: 'var(--color-coach)' }}>
                    <Users2 size={11} />
                    {branch.coach_count ?? 0} coaches
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-client-light)', color: 'var(--color-client)' }}>
                    <Users2 size={11} />
                    {branch.client_count ?? 0} clientes
                  </span>
                </div>

                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Creada {formatDate(branch.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
