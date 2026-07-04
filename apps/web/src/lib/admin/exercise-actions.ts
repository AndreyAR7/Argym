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
    demo_video_storage_path?: string | null
    demo_video_bucket?: string | null
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
    demo_video_storage_path?: string | null
    demo_video_bucket?: string | null
  },
) {
  try {
    const { supabase, tenantId } = await getContext()
    const { error } = await supabase
      .from('exercises')
      .update(data)
      .eq('id', exerciseId)
      .eq('tenant_id', tenantId)
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
    revalidatePath(`/admin/routines/${routineId}`)
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

export async function cloneRoutineAction(routineId: string) {
  try {
    const { supabase, user, tenantId } = await getContext()

    // Fetch original routine
    const { data: original, error: fetchErr } = await supabase
      .from('routines')
      .select('name, description, level, allowed_plans, allowed_levels, is_template')
      .eq('id', routineId)
      .eq('tenant_id', tenantId)
      .single()
    if (fetchErr || !original) throw fetchErr ?? new Error('Rutina no encontrada')

    // Fetch exercises
    const { data: exercises } = await supabase
      .from('exercises')
      .select('name, muscle, sets, reps, rest_seconds, notes, sort_order, demo_video_storage_path, demo_video_bucket')
      .eq('routine_id', routineId)
      .order('sort_order', { ascending: true })

    // Create new routine
    const { data: cloned, error: insertErr } = await supabase
      .from('routines')
      .insert({
        tenant_id:      tenantId,
        created_by:     user.id,
        name:           `${original.name} (Copia)`,
        description:    original.description,
        level:          original.level,
        allowed_plans:  original.allowed_plans,
        allowed_levels: original.allowed_levels,
        is_template:    original.is_template,
        is_active:      false,
      })
      .select('id')
      .single()
    if (insertErr || !cloned) throw insertErr ?? new Error('No se pudo crear la copia')

    // Clone exercises if any
    if (exercises && exercises.length > 0) {
      const { error: exErr } = await supabase.from('exercises').insert(
        exercises.map((ex) => ({ ...ex, routine_id: cloned.id, tenant_id: tenantId }))
      )
      if (exErr) throw exErr
    }

    revalidatePath('/admin/routines')
    return { success: true, routineId: cloned.id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
