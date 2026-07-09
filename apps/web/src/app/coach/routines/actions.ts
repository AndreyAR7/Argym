'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getCoachClientsAction(): Promise<{
  data?: { id: string; full_name: string; client_level: string | null }[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'No autenticado. Por favor inicia sesión.' }
    }

    const { data, error } = await supabase
      .from('coach_client_assignments')
      .select('client_id, profiles!coach_client_assignments_client_id_fkey(id, full_name, client_level)')
      .eq('coach_id', user.id)

    if (error) {
      console.error('getCoachClientsAction error:', error)
      return { error: error.message }
    }

    const clients = (data ?? [])
      .map((row: any) => row.profiles)
      .filter(Boolean) as { id: string; full_name: string; client_level: string | null }[]

    return { data: clients }
  } catch (err: any) {
    console.error('getCoachClientsAction unexpected error:', err)
    return { error: err?.message ?? 'Error inesperado. Intenta de nuevo.' }
  }
}

export async function assignRoutineAction(
  routineId: string,
  clientId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autenticado. Por favor inicia sesión.' }
    }

    // Verify this coach has the client assigned
    const { data: assignment } = await supabase
      .from('coach_client_assignments')
      .select('coach_id')
      .eq('coach_id', user.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (!assignment) {
      return { success: false, error: 'No autorizado: este cliente no está asignado a ti.' }
    }

    // Get tenant_id from coach's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'No se pudo obtener el perfil del coach.' }
    }

    // Check if assignment already exists to avoid duplicates
    const { data: existing } = await supabase
      .from('routine_assignments')
      .select('id')
      .eq('routine_id', routineId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Esta rutina ya está asignada a este cliente.' }
    }

    const { error: insertError } = await supabase.from('routine_assignments').insert({
      routine_id:  routineId,
      client_id:   clientId,
      tenant_id:   profile.tenant_id,
      assigned_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('assignRoutineAction insert error:', insertError)
      // Catch unique-constraint violation at the DB level too
      if (insertError.code === '23505') {
        return { success: false, error: 'Esta rutina ya está asignada a este cliente.' }
      }
      return { success: false, error: insertError.message }
    }

    revalidatePath('/coach/routines')
    return { success: true }
  } catch (err: any) {
    console.error('assignRoutineAction unexpected error:', err)
    return { success: false, error: err?.message ?? 'Error inesperado. Intenta de nuevo.' }
  }
}
