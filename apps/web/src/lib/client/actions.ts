'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile) return null
  return { supabase, userId: user.id, tenantId: profile.tenant_id as string }
}

export async function toggleExerciseProgressAction(
  routineId: string,
  exerciseId: string,
  completed: boolean,
) {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'No autenticado' }

  const today = new Date().toISOString().split('T')[0]
  const { error } = await ctx.supabase
    .from('exercise_progress')
    .upsert(
      {
        routine_id: routineId,
        exercise_id: exerciseId,
        client_id: ctx.userId,
        tenant_id: ctx.tenantId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        session_date: today,
      },
      { onConflict: 'exercise_id,client_id,session_date' },
    )

  if (error) return { error: error.message }
  revalidatePath(`/client/routine/${routineId}`)
  return { success: true }
}

export async function upsertBodyMeasurementAction(data: {
  weight_kg: number
  height_cm: number | null
  body_fat_pct: number | null
  waist_cm: number | null
  notes: string | null
}) {
  const ctx = await getAuthContext()
  if (!ctx) return { error: 'No autenticado' }

  const today = new Date().toISOString().split('T')[0]
  const { error } = await ctx.supabase
    .from('body_measurements')
    .upsert(
      {
        client_id: ctx.userId,
        tenant_id: ctx.tenantId,
        measured_at: today,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
        body_fat_pct: data.body_fat_pct,
        muscle_mass_kg: null,
        waist_cm: data.waist_cm,
        chest_cm: null,
        hip_cm: null,
        arm_cm: null,
        notes: data.notes,
      },
      { onConflict: 'client_id,measured_at' },
    )

  if (error) return { error: error.message }
  revalidatePath('/client/progress')
  return { success: true }
}
