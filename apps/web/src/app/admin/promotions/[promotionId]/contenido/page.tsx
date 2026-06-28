import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { ArrowLeft, Package } from 'lucide-react'
import { ContentManager } from '@/components/admin/content-manager'
import {
  addVideoToPromotionAction,
  removeVideoFromPromotionAction,
  addNutritionToPromotionAction,
  removeNutritionFromPromotionAction,
} from '@/lib/admin/plan-content-actions'

export async function generateMetadata() {
  return { title: 'Contenido de promoción' }
}

export default async function PromotionContenidoPage({ params }: { params: Promise<{ promotionId: string }> }) {
  const { promotionId } = await params
  const session = await getSessionData()
  if (!session) redirect('/login')
  const { supabase, tenantId } = session

  const { data: promotion } = await supabase
    .from('promotions')
    .select('id, title, type')
    .eq('id', promotionId)
    .eq('tenant_id', tenantId)
    .single()

  if (!promotion) notFound()

  const [
    { data: allVideos },
    { data: allNutritions },
    { data: promoVideoRows },
    { data: promoNutritionRows },
  ] = await Promise.all([
    supabase.from('videos').select('id, title, status').eq('tenant_id', tenantId).order('title'),
    supabase.from('nutrition_plans').select('id, name, status').eq('tenant_id', tenantId).order('name'),
    supabase.from('promotion_videos').select('video_id').eq('promotion_id', promotionId),
    supabase.from('promotion_nutritions').select('nutrition_plan_id').eq('promotion_id', promotionId),
  ])

  const assignedVideoIds = new Set((promoVideoRows ?? []).map((r: any) => r.video_id))
  const assignedNutritionIds = new Set((promoNutritionRows ?? []).map((r: any) => r.nutrition_plan_id))

  const assignedVideos = (allVideos ?? []).filter((v: any) => assignedVideoIds.has(v.id))
  const availableVideos = (allVideos ?? []).filter((v: any) => !assignedVideoIds.has(v.id))
  const assignedNutritions = (allNutritions ?? []).filter((n: any) => assignedNutritionIds.has(n.id))
  const availableNutritions = (allNutritions ?? []).filter((n: any) => !assignedNutritionIds.has(n.id))

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          href="/admin/promotions"
          className="flex items-center gap-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft size={14} />
          Promociones
        </Link>
        <span className="text-[var(--color-border)]">/</span>
        <span className="font-medium text-[var(--color-foreground)] truncate">{promotion.title}</span>
        <span className="text-[var(--color-border)]">/</span>
        <span className="text-[var(--color-muted-foreground)]">Contenido</span>
      </div>

      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center flex-shrink-0">
          <Package size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Contenido de la promoción</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            Videos y planes nutricionales adicionales incluidos en <strong>{promotion.title}</strong>. Los suscriptores que usaron esta promoción tendrán acceso.
          </p>
        </div>
      </div>

      <ContentManager
        entityId={promotionId}
        assignedVideos={assignedVideos}
        availableVideos={availableVideos}
        assignedNutritions={assignedNutritions}
        availableNutritions={availableNutritions}
        addVideoAction={addVideoToPromotionAction}
        removeVideoAction={removeVideoFromPromotionAction}
        addNutritionAction={addNutritionToPromotionAction}
        removeNutritionAction={removeNutritionFromPromotionAction}
      />
    </div>
  )
}
