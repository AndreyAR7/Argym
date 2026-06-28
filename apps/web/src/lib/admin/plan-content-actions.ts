'use server'

import { revalidatePath } from 'next/cache'
import { getSessionData } from '@/lib/auth/session'

export async function addVideoToPlanAction(planId: string, videoId: string) {
  const session = await getSessionData()
  if (!session) return { error: 'No autorizado' }
  const { error } = await session.supabase.from('plan_videos').insert({ plan_id: planId, video_id: videoId })
  if (error) return { error: error.message }
  revalidatePath(`/admin/plans/${planId}/contenido`)
  return { ok: true }
}

export async function removeVideoFromPlanAction(planId: string, videoId: string) {
  const session = await getSessionData()
  if (!session) return { error: 'No autorizado' }
  const { error } = await session.supabase.from('plan_videos').delete().eq('plan_id', planId).eq('video_id', videoId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/plans/${planId}/contenido`)
  return { ok: true }
}

export async function addNutritionToPlanAction(planId: string, nutritionPlanId: string) {
  const session = await getSessionData()
  if (!session) return { error: 'No autorizado' }
  const { error } = await session.supabase.from('plan_nutritions').insert({ plan_id: planId, nutrition_plan_id: nutritionPlanId })
  if (error) return { error: error.message }
  revalidatePath(`/admin/plans/${planId}/contenido`)
  return { ok: true }
}

export async function removeNutritionFromPlanAction(planId: string, nutritionPlanId: string) {
  const session = await getSessionData()
  if (!session) return { error: 'No autorizado' }
  const { error } = await session.supabase.from('plan_nutritions').delete().eq('plan_id', planId).eq('nutrition_plan_id', nutritionPlanId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/plans/${planId}/contenido`)
  return { ok: true }
}

export async function addVideoToPromotionAction(promotionId: string, videoId: string) {
  const session = await getSessionData()
  if (!session) return { error: 'No autorizado' }
  const { error } = await session.supabase.from('promotion_videos').insert({ promotion_id: promotionId, video_id: videoId })
  if (error) return { error: error.message }
  revalidatePath(`/admin/promotions/${promotionId}/contenido`)
  return { ok: true }
}

export async function removeVideoFromPromotionAction(promotionId: string, videoId: string) {
  const session = await getSessionData()
  if (!session) return { error: 'No autorizado' }
  const { error } = await session.supabase.from('promotion_videos').delete().eq('promotion_id', promotionId).eq('video_id', videoId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/promotions/${promotionId}/contenido`)
  return { ok: true }
}

export async function addNutritionToPromotionAction(promotionId: string, nutritionPlanId: string) {
  const session = await getSessionData()
  if (!session) return { error: 'No autorizado' }
  const { error } = await session.supabase.from('promotion_nutritions').insert({ promotion_id: promotionId, nutrition_plan_id: nutritionPlanId })
  if (error) return { error: error.message }
  revalidatePath(`/admin/promotions/${promotionId}/contenido`)
  return { ok: true }
}

export async function removeNutritionFromPromotionAction(promotionId: string, nutritionPlanId: string) {
  const session = await getSessionData()
  if (!session) return { error: 'No autorizado' }
  const { error } = await session.supabase.from('promotion_nutritions').delete().eq('promotion_id', promotionId).eq('nutrition_plan_id', nutritionPlanId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/promotions/${promotionId}/contenido`)
  return { ok: true }
}
