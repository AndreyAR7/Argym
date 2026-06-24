'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Videos ────────────────────────────────────────────────────

export async function updateVideoStatusAction(
  videoId: string,
  status: 'published' | 'archived' | 'draft',
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('videos')
    .update({ status })
    .eq('id', videoId)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Routines ───────────────────────────────────────────────────

export async function toggleRoutineActiveAction(routineId: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('routines')
    .update({ is_active: isActive })
    .eq('id', routineId)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Nutrition Plans ────────────────────────────────────────────

export async function updateNutritionStatusAction(
  planId: string,
  status: 'draft' | 'published' | 'archived',
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('nutrition_plans')
    .update({ status })
    .eq('id', planId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function createNutritionPlanAction(data: {
  name: string
  description: string | null
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  goal: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase.from('nutrition_plans').insert({
    tenant_id: profile!.tenant_id,
    created_by: user.id,
    name: data.name,
    description: data.description,
    calories_target: data.calories_target,
    protein_g: data.protein_g,
    carbs_g: data.carbs_g,
    fat_g: data.fat_g,
    goal: data.goal,
    status: 'draft',
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/nutrition-plans')
  return { success: true }
}

// ── Promotions ─────────────────────────────────────────────────

export async function createPromotionAction(data: {
  title: string
  description: string | null
  type: 'discount' | 'announcement' | 'bundle'
  discount_percentage: number | null
  discount_amount: number | null
  start_date: string
  end_date: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase.from('promotions').insert({
    tenant_id: profile!.tenant_id,
    created_by: user.id,
    title: data.title,
    description: data.description,
    type: data.type,
    discount_percentage: data.discount_percentage,
    discount_amount: data.discount_amount,
    start_date: data.start_date,
    end_date: data.end_date || null,
    is_active: true,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/promotions')
  return { success: true }
}

export async function updatePromotionAction(
  promoId: string,
  data: {
    title: string
    description: string | null
    discount_percentage: number | null
    discount_amount: number | null
    start_date: string
    end_date: string | null
  },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('promotions')
    .update({
      title: data.title,
      description: data.description,
      discount_percentage: data.discount_percentage,
      discount_amount: data.discount_amount,
      start_date: data.start_date,
      end_date: data.end_date || null,
    })
    .eq('id', promoId)

  if (error) return { error: error.message }
  revalidatePath('/admin/promotions')
  return { success: true }
}

export async function togglePromotionActiveAction(promoId: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('promotions')
    .update({ is_active: isActive })
    .eq('id', promoId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deletePromotionAction(promoId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Perfil no encontrado' }

  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', promoId)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }
  revalidatePath('/admin/promotions')
  return { success: true }
}
