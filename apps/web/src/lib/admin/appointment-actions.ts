'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled',
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function createAppointmentAction(data: {
  client_id: string
  coach_id: string | null
  title: string
  description: string | null
  start_time: string
  end_time: string
  appointment_type: 'in_person' | 'virtual' | 'phone'
  location: string | null
  meeting_url: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return { error: 'No se pudo obtener el tenant del usuario' }

  const { data: newId, error } = await supabase.rpc('create_appointment', {
    p_title:            data.title,
    p_client_id:        data.client_id,
    p_coach_id:         data.coach_id || null,
    p_start_time:       data.start_time,
    p_end_time:         data.end_time,
    p_status:           'scheduled',
    p_appointment_type: data.appointment_type,
    p_location:         data.location,
    p_meeting_url:      data.meeting_url,
    p_description:      data.description,
    p_group_mode:       'individual',
  })

  if (error) {
    console.error('[createAppointmentAction] RPC error:', error)
    return { error: error.message }
  }

  console.log('[createAppointmentAction] Created appointment:', newId)
  revalidatePath('/admin/appointments')
  return { success: true }
}
