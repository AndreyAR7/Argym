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

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase.from('appointments').insert({
    tenant_id: profile!.tenant_id,
    client_id: data.client_id,
    coach_id: data.coach_id || null,
    title: data.title,
    description: data.description,
    start_time: data.start_time,
    end_time: data.end_time,
    status: 'scheduled',
    appointment_type: data.appointment_type,
    location: data.location,
    meeting_url: data.meeting_url,
    group_mode: 'individual',
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  return { success: true }
}
