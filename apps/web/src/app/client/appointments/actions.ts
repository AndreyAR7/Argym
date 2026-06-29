'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function requestAppointmentAction(formData: {
  title: string
  appointment_type: string
  preferred_date: string   // ISO date string YYYY-MM-DD
  preferred_time: string   // HH:MM
  duration_minutes: number
  notes: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autenticado. Por favor inicia sesión.' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'No se pudo obtener el perfil del usuario.' }
    }

    const start_time = new Date(`${formData.preferred_date}T${formData.preferred_time}:00`)
    if (isNaN(start_time.getTime())) {
      return { success: false, error: 'Fecha u hora inválida.' }
    }

    const end_time = new Date(start_time.getTime() + formData.duration_minutes * 60 * 1000)

    const { error: insertError } = await supabase.from('appointments').insert({
      tenant_id:        profile.tenant_id,
      client_id:        user.id,
      title:            formData.title,
      appointment_type: formData.appointment_type,
      start_time:       start_time.toISOString(),
      end_time:         end_time.toISOString(),
      status:           'pending_confirmation',
      notes:            formData.notes || null,
    })

    if (insertError) {
      console.error('requestAppointmentAction insert error:', insertError)
      return { success: false, error: insertError.message }
    }

    revalidatePath('/client/appointments')
    return { success: true }
  } catch (err: any) {
    console.error('requestAppointmentAction unexpected error:', err)
    return { success: false, error: err?.message ?? 'Error inesperado. Intenta de nuevo.' }
  }
}
