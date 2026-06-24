import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { NewPromotionButton } from '@/components/admin/new-promotion-button'
import { PromotionCard } from '@/components/admin/promotion-card'
import { Tag } from 'lucide-react'

export const metadata = { title: 'Promociones' }

export default async function PromotionsPage() {
  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const { data: promotions } = await supabase
    .from('promotions')
    .select('id, title, description, type, discount_percentage, discount_amount, start_date, end_date, is_active, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const active = (promotions ?? []).filter((p) => p.is_active)
  const inactive = (promotions ?? []).filter((p) => !p.is_active)

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Promociones"
        subtitle={`${active.length} activa${active.length !== 1 ? 's' : ''}`}
      >
        <NewPromotionButton />
      </PageHeader>

      {!promotions || promotions.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-admin-light)] flex items-center justify-center">
            <Tag size={24} className="text-[var(--color-admin)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">No hay promociones</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Crea tu primera promoción para tus clientes.</p>
          <NewPromotionButton />
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">Activas</h2>
              <div className="space-y-3">
                {active.map((p) => <PromotionCard key={p.id} promotion={p} />)}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">Inactivas</h2>
              <div className="space-y-3 opacity-60">
                {inactive.map((p) => <PromotionCard key={p.id} promotion={p} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
