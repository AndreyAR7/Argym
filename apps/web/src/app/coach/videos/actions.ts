'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCoachClientsAction(): Promise<{
  success: boolean
  clients?: { id: string; full_name: string | null }[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autenticado.' }
    }

    const { data: assignmentRows, error: assignError } = await supabase
      .from('coach_client_assignments')
      .select('client_id')
      .eq('coach_id', user.id)

    if (assignError) {
      return { success: false, error: assignError.message }
    }

    const clientIds = (assignmentRows ?? []).map((a: any) => a.client_id as string)

    if (clientIds.length === 0) {
      return { success: true, clients: [] }
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', clientIds)
      .order('full_name', { ascending: true })

    if (profilesError) {
      return { success: false, error: profilesError.message }
    }

    return { success: true, clients: profiles ?? [] }
  } catch (err: any) {
    console.error('getCoachClientsAction error:', err)
    return { success: false, error: err?.message ?? 'Error inesperado.' }
  }
}

export async function assignVideoAction(
  videoId: string,
  clientId: string,
  note?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autenticado.' }
    }

    // Get coach's tenant_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'No se pudo obtener el perfil del coach.' }
    }

    // Verify coach has this client assigned
    const { data: assignment } = await supabase
      .from('coach_client_assignments')
      .select('coach_id')
      .eq('coach_id', user.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (!assignment) {
      return { success: false, error: 'No autorizado: este cliente no está asignado a ti.' }
    }

    // Check if already assigned
    const { data: existing } = await supabase
      .from('video_assignments')
      .select('id')
      .eq('video_id', videoId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Este video ya está asignado a este cliente.' }
    }

    // Insert assignment
    const { error: insertError } = await supabase.from('video_assignments').insert({
      video_id:    videoId,
      client_id:   clientId,
      tenant_id:   profile.tenant_id,
      assigned_at: new Date().toISOString(),
      note:        note || null,
    })

    if (insertError) {
      console.error('assignVideoAction insert error:', insertError)
      return { success: false, error: insertError.message }
    }

    revalidatePath('/coach/videos')
    return { success: true }
  } catch (err: any) {
    console.error('assignVideoAction unexpected error:', err)
    return { success: false, error: err?.message ?? 'Error inesperado. Intenta de nuevo.' }
  }
}
