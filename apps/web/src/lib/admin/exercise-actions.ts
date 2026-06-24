'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  return { supabase, user, tenantId: profile?.tenant_id as string }
}

export async function addExerciseAction(
  routineId: string,
  data: {
    name: string
    muscle: string
    sets: number
    reps: number
    rest_seconds: number
    notes: string | null
    sort_order: number
  },
) {
  try {
    const { supabase, tenantId } = await getContext()
    const { error } = await supabase.from('exercises').insert({
      routine_id: routineId,
      tenant_id: tenantId,
      ...data,
    })
    if (error) throw error
    revalidatePath(`/admin/routines/${routineId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateExerciseAction(
  exerciseId: string,
  routineId: string,
  data: {
    name: string
    muscle: string
    sets: number
    reps: number
    rest_seconds: number
    notes: string | null
  },
) {
  try {
    const { supabase } = await getContext()
    const { error } = await supabase
      .from('exercises')
      .update(data)
      .eq('id', exerciseId)
    if (error) throw error
    revalidatePath(`/admin/routines/${routineId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteExerciseAction(exerciseId: string, routineId: string) {
  try {
    const { supabase, tenantId } = await getContext()
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', exerciseId)
      .eq('tenant_id', tenantId)
    if (error) throw error
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateRoutineAction(
  routineId: string,
  data: { name: string; description: string | null; level: string; is_active: boolean },
) {
  try {
    const { supabase } = await getContext()
    const { error } = await supabase
      .from('routines')
      .update(data)
      .eq('id', routineId)
    if (error) throw error
    revalidatePath('/admin/routines')
    revalidatePath(`/admin/routines/${routineId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function createRoutineAction(data: {
  name: string
  description: string | null
  level: string
  allowed_plans: string[]
  allowed_levels: string[]
  is_active: boolean
  is_template: boolean
}) {
  try {
    const { supabase, user, tenantId } = await getContext()
    const { data: routine, error } = await supabase
      .from('routines')
      .insert({
        ...data,
        tenant_id: tenantId,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (error) throw error
    revalidatePath('/admin/routines')
    return { success: true, routineId: routine.id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteRoutineAction(routineId: string) {
  try {
    const { supabase, tenantId } = await getContext()
    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId)
      .eq('tenant_id', tenantId)
    if (error) throw error
    revalidatePath('/admin/routines')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
