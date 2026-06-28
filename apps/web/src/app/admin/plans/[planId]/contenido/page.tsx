import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { ArrowLeft, LayoutGrid } from 'lucide-react'
import { ContentManager } from '@/components/admin/content-manager'
import {
  addVideoToPlanAction,
  removeVideoFromPlanAction,
  addNutritionToPlanAction,
  removeNutritionFromPlanAction,
} from '@/lib/admin/plan-content-actions'

export async function generateMetadata({ params }: { params: Promise<{ planId: string }> }) {
  return { title: 'Contenido del plan' }
}

export default async function PlanContenidoPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params
  const session = await getSessionData()
  if (!session) redirect('/login')
  const { supabase, tenantId } = session

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name')
    .eq('id', planId)
    .eq('tenant_id', tenantId)
    .single()

  if (!plan) notFound()

  const [
    { data: allVideos },
    { data: allNutritions },
    { data: planVideoRows },
    { data: planNutritionRows },
  ] = await Promise.all([
    supabase.from('videos').select('id, title, status').eq('tenant_id', tenantId).order('title'),
    supabase.from('nutrition_plans').select('id, name, status').eq('tenant_id', tenantId).order('name'),
    supabase.from('plan_videos').select('video_id').eq('plan_id', planId),
    supabase.from('plan_nutritions').select('nutrition_plan_id').eq('plan_id', planId),
  ])

  const assignedVideoIds = new Set((planVideoRows ?? []).map((r: any) => r.video_id))
  const assignedNutritionIds = new Set((planNutritionRows ?? []).map((r: any) => r.nutrition_plan_id))

  const assignedVideos = (allVideos ?? []).filter((v: any) => assignedVideoIds.has(v.id))
  const availableVideos = (allVideos ?? []).filter((v: any) => !assignedVideoIds.has(v.id))
  const assignedNutritions = (allNutritions ?? []).filter((n: any) => assignedNutritionIds.has(n.id))
  const availableNutritions = (allNutritions ?? []).filter((n: any) => !assignedNutritionIds.has(n.id))

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          href="/admin/plans"
          className="flex items-center gap-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft size={14} />
          Planes
        </Link>
        <span className="text-[var(--color-border)]">/</span>
        <span className="font-medium text-[var(--color-foreground)] truncate">{plan.name}</span>
        <span className="text-[var(--color-border)]">/</span>
        <span className="text-[var(--color-muted-foreground)]">Contenido</span>
      </div>

      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-admin-light)] flex items-center justify-center flex-shrink-0">
          <LayoutGrid size={18} className="text-[var(--color-admin)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Contenido del plan</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            Videos y planes nutricionales incluidos en <strong>{plan.name}</strong>. Todos los suscriptores activos tendrán acceso automático.
          </p>
        </div>
      </div>

      <ContentManager
        entityId={planId}
        assignedVideos={assignedVideos}
        availableVideos={availableVideos}
        assignedNutritions={assignedNutritions}
        availableNutritions={availableNutritions}
        addVideoAction={addVideoToPlanAction}
        removeVideoAction={removeVideoFromPlanAction}
        addNutritionAction={addNutritionToPlanAction}
        removeNutritionAction={removeNutritionFromPlanAction}
      />
    </div>
  )
}
