'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function recordMeasurementAction(
  clientId: string,
  data: {
    weight_kg?: number | null
    height_cm?: number | null
    body_fat_pct?: number | null
    neck_cm?: number | null
    shoulder_cm?: number | null
    chest_cm?: number | null
    waist_cm?: number | null
    abdomen_cm?: number | null
    hip_cm?: number | null
    arm_cm?: number | null
    thigh_cm?: number | null
    calf_cm?: number | null
    notes?: string | null
  },
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
      return { success: false, error: 'No autorizado' }
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

    const { error: insertError } = await supabase.from('body_measurements').insert({
      client_id:    clientId,
      tenant_id:    profile.tenant_id,
      measured_at:  new Date().toISOString(),
      weight_kg:    data.weight_kg ?? null,
      height_cm:    data.height_cm ?? null,
      body_fat_pct: data.body_fat_pct ?? null,
      neck_cm:      data.neck_cm ?? null,
      shoulder_cm:  data.shoulder_cm ?? null,
      chest_cm:     data.chest_cm ?? null,
      waist_cm:     data.waist_cm ?? null,
      abdomen_cm:   data.abdomen_cm ?? null,
      hip_cm:       data.hip_cm ?? null,
      arm_cm:       data.arm_cm ?? null,
      thigh_cm:     data.thigh_cm ?? null,
      calf_cm:      data.calf_cm ?? null,
      notes:        data.notes ?? null,
    })

    if (insertError) {
      console.error('recordMeasurementAction insert error:', insertError)
      return { success: false, error: insertError.message }
    }

    revalidatePath(`/coach/clients/${clientId}`)
    return { success: true }
  } catch (err: any) {
    console.error('recordMeasurementAction unexpected error:', err)
    return { success: false, error: err?.message ?? 'Error inesperado. Intenta de nuevo.' }
  }
}
