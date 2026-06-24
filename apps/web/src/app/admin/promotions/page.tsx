import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { NewPromotionButton } from '@/components/admin/new-promotion-button'
import { PromotionCard } from '@/components/admin/promotion-card'
import { Tag, Megaphone, Package, Percent } from 'lucide-react'

export const metadata = { title: 'Promociones' }

const CATEGORIES = [
  {
    type: 'announcement',
    label: 'Anuncios',
    icon: Megaphone,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    type: 'bundle',
    label: 'Paquetes',
    icon: Package,
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  {
    type: 'discount',
    label: 'Descuentos',
    icon: Percent,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
] as const

export default async function PromotionsPage() {
  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const { data: promotions } = await supabase
    .from('promotions')
    .select('id, title, description, type, discount_percentage, discount_amount, start_date, end_date, is_active, created_at')
    .eq('tenant_id', tenantId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })

  const all = promotions ?? []
  const activeCount = all.filter((p) => p.is_active).length

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Promociones"
        subtitle={`${activeCount} activa${activeCount !== 1 ? 's' : ''} · ${all.length} en total`}
      >
        <NewPromotionButton />
      </PageHeader>

      {all.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-admin-light)] flex items-center justify-center">
            <Tag size={24} className="text-[var(--color-admin)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">No hay promociones</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Crea tu primera promoción para tus clientes.</p>
          <NewPromotionButton />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {CATEGORIES.map(({ type, label, icon: Icon, color, bg, border }) => {
            const items = all.filter((p) => p.type === type)
            if (items.length === 0) return null
            return (
              <section key={type}>
                {/* Category header */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${color} ${bg} ${border}`}>
                    <Icon size={15} />
                  </div>
                  <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                    {label}
                  </h2>
                  <span className="text-xs text-[var(--color-muted-foreground)] bg-[var(--color-muted)] px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {items.map((p) => (
                    <div key={p.id} className={p.is_active ? '' : 'opacity-55'}>
                      <PromotionCard promotion={p} />
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
