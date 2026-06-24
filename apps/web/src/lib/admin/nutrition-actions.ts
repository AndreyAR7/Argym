'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Update Nutrition Plan ──────────────────────────────────────

export async function updateNutritionPlanAction(
  planId: string,
  data: {
    name: string
    description: string
    calories_target: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
    goal: string
    status: string
    is_template: boolean
  },
) {
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
    .from('nutrition_plans')
    .update({
      name: data.name,
      description: data.description,
      calories_target: data.calories_target,
      protein_g: data.protein_g,
      carbs_g: data.carbs_g,
      fat_g: data.fat_g,
      goal: data.goal,
      status: data.status,
      is_template: data.is_template,
    })
    .eq('id', planId)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }
  revalidatePath('/admin/nutrition-plans')
  return { success: true }
}

// ── Delete Nutrition Plan ──────────────────────────────────────

export async function deleteNutritionPlanAction(planId: string) {
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
    .from('nutrition_plans')
    .delete()
    .eq('id', planId)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Assign Nutrition Plan ──────────────────────────────────────

export async function assignNutritionPlanAction(
  planId: string,
  clientId: string,
  note: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil no encontrado' }

  const { error } = await supabase.from('nutrition_assignments').upsert({
    nutrition_plan_id: planId,
    client_id: clientId,
    tenant_id: profile.tenant_id,
    assigned_by: user.id,
    note: note || null,
  }, { onConflict: 'nutrition_plan_id,client_id', ignoreDuplicates: true })

  if (error) return { error: error.message }
  revalidatePath('/admin/nutrition-plans')
  return { success: true }
}

// ── Unassign Nutrition Plan ────────────────────────────────────

export async function unassignNutritionPlanAction(planId: string, clientId: string) {
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
    .from('nutrition_assignments')
    .delete()
    .eq('nutrition_plan_id', planId)
    .eq('client_id', clientId)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }
  revalidatePath('/admin/nutrition-plans')
  return { success: true }
}
