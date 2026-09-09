'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Coach-scoped appointment editing — a reduced field set compared to the
// admin edit modal (no title/status-machine/coach-reassignment/delete).
// RLS (appointments_own, FOR ALL) already restricts every write here to
// appointments where coach_id = the caller, but we double-check tenant/
// ownership up front for a clear error message instead of a raw RLS
// rejection.

async function getCallerId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, userId: null }
  return { error: null, userId: user.id }
}

async function assertOwnAppointment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appointmentId: string,
  coachId: string,
) {
  const { data } = await supabase
    .from('appointments')
    .select('id')
    .eq('id', appointmentId)
    .eq('coach_id', coachId)
    .single()
  return !!data
}

export async function updateCoachAppointmentAction(
  appointmentId: string,
  data: {
    start_time: string
    end_time: string
    location: string | null
    meeting_url: string | null
    description: string | null
  },
) {
  const supabase = await createClient()
  const { error: authErr, userId } = await getCallerId(supabase)
  if (authErr) return { error: authErr }

  if (!(await assertOwnAppointment(supabase, appointmentId, userId!))) {
    return { error: 'Esta cita no te pertenece' }
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      start_time: data.start_time,
      end_time: data.end_time,
      location: data.location,
      meeting_url: data.meeting_url,
      description: data.description,
    })
    .eq('id', appointmentId)

  if (error) return { error: error.message }
  revalidatePath('/coach/appointments')
  return { success: true }
}

export async function cancelCoachAppointmentAction(appointmentId: string) {
  const supabase = await createClient()
  const { error: authErr, userId } = await getCallerId(supabase)
  if (authErr) return { error: authErr }

  if (!(await assertOwnAppointment(supabase, appointmentId, userId!))) {
    return { error: 'Esta cita no te pertenece' }
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancellation_reason: 'Cancelada por el coach.' })
    .eq('id', appointmentId)

  if (error) return { error: error.message }
  revalidatePath('/coach/appointments')
  return { success: true }
}

export async function addCoachAppointmentParticipantAction(appointmentId: string, clientId: string) {
  const supabase = await createClient()
  const { error: authErr, userId } = await getCallerId(supabase)
  if (authErr) return { error: authErr }

  if (!(await assertOwnAppointment(supabase, appointmentId, userId!))) {
    return { error: 'Esta cita no te pertenece' }
  }

  const { data: appt } = await supabase
    .from('appointments')
    .select('tenant_id')
    .eq('id', appointmentId)
    .single()
  if (!appt) return { error: 'Cita no encontrada' }

  const { error } = await supabase
    .from('appointment_participants')
    .upsert(
      {
        appointment_id: appointmentId,
        user_id: clientId,
        tenant_id: appt.tenant_id,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'appointment_id,user_id' },
    )

  if (error) return { error: error.message }
  revalidatePath('/coach/appointments')
  return { success: true }
}

export async function removeCoachAppointmentParticipantAction(appointmentId: string, clientId: string) {
  const supabase = await createClient()
  const { error: authErr, userId } = await getCallerId(supabase)
  if (authErr) return { error: authErr }

  if (!(await assertOwnAppointment(supabase, appointmentId, userId!))) {
    return { error: 'Esta cita no te pertenece' }
  }

  const { error } = await supabase
    .from('appointment_participants')
    .delete()
    .eq('appointment_id', appointmentId)
    .eq('user_id', clientId)

  if (error) return { error: error.message }
  revalidatePath('/coach/appointments')
  return { success: true }
}
