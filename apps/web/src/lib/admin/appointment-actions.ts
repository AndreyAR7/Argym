'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getCallerTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, tenantId: null }
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile) return { error: 'Perfil no encontrado' as const, tenantId: null }
  return { error: null, tenantId: profile.tenant_id }
}

export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: 'pending_confirmation' | 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled' | 'postpone_requested',
) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { error: authErr }

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId!)

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
  participant_ids?: string[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: newId, error } = await supabase.rpc('create_appointment', {
    p_title:            data.title,
    p_client_id:        data.client_id,
    p_coach_id:         data.coach_id || null,
    p_start_time:       data.start_time,
    p_end_time:         data.end_time,
    p_status:           'pending_confirmation',
    p_appointment_type: data.appointment_type,
    p_location:         data.location,
    p_meeting_url:      data.meeting_url,
    p_description:      data.description,
    p_group_mode:       data.participant_ids && data.participant_ids.length > 1 ? 'group' : 'individual',
    p_participant_ids:  data.participant_ids ?? null,
  })

  if (error) {
    console.error('[createAppointmentAction] RPC error:', error)
    return { error: error.message }
  }

  console.log('[createAppointmentAction] Created appointment:', newId)
  revalidatePath('/admin/appointments')
  revalidatePath('/coach/appointments')
  return { success: true }
}

export async function updateAppointmentAction(
  id: string,
  data: {
    title: string
    start_time: string
    end_time: string
    status: 'pending_confirmation' | 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled' | 'postpone_requested'
    appointment_type: 'in_person' | 'virtual' | 'phone'
    coach_id: string | null
    client_id: string | null
    location: string | null
    meeting_url: string | null
    description: string | null
  },
) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { error: authErr }

  const { error } = await supabase
    .from('appointments')
    .update(data)
    .eq('id', id)
    .eq('tenant_id', tenantId!)

  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  return { success: true }
}

export async function deleteAppointmentAction(id: string) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { error: authErr }

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId!)

  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  return { success: true }
}
