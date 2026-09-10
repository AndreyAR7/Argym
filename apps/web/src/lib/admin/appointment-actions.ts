'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { friendlyAppointmentError } from './appointment-error'
import { queueNotification } from '@/lib/notifications/send-notification'
import type { AppointmentStatus } from '@platform/types'
import { computeWeeklyOccurrences } from '@platform/types'

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
  status: AppointmentStatus,
) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { error: authErr }

  const { error } = await supabase
    .from('appointments')
    .update(status === 'cancelled' ? { status, cancellation_reason: 'Cancelada por el administrador.' } : { status })
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId!)

  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  revalidatePath('/coach/appointments')
  return { success: true }
}

// Cancels every future, still-active occurrence of a recurring series
// (this one included) — used by the "cancelar esta y las futuras" choice
// in the edit modal. Past/terminal occurrences are left untouched.
export async function cancelAppointmentSeriesAction(seriesId: string, fromStartTime: string) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { error: authErr }

  const { error, count } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancellation_reason: 'Cancelada por el administrador (serie).' }, { count: 'exact' })
    .eq('series_id', seriesId)
    .eq('tenant_id', tenantId!)
    .gte('start_time', fromStartTime)
    .not('status', 'in', '(cancelled,completed,no_show)')

  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  revalidatePath('/coach/appointments')
  return { success: true, cancelledCount: count ?? 0 }
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
  repeat_weeks?: number
  /** From the "Clase" choice in the create flow — forces group_mode='group'
   * even with a single invitee, so a one-attendee "clase privada" still
   * shows up as a class everywhere instead of silently becoming a 1:1. */
  is_class?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (new Date(data.start_time) < new Date()) {
    return { error: 'No se puede crear una cita en un horario que ya pasó.' }
  }

  const occurrences = computeWeeklyOccurrences(data.start_time, data.end_time, data.repeat_weeks ?? 1)
  const seriesId = occurrences.length > 1 ? crypto.randomUUID() : null

  let createdCount = 0
  for (const occ of occurrences) {
    const { data: newId, error } = await supabase.rpc('create_appointment', {
      p_title:            data.title,
      p_client_id:        data.client_id,
      p_coach_id:         data.coach_id || null,
      p_start_time:       occ.start_time,
      p_end_time:         occ.end_time,
      p_status:           'pending_confirmation',
      p_appointment_type: data.appointment_type,
      p_location:         data.location,
      p_meeting_url:      data.meeting_url,
      p_description:      data.description,
      p_group_mode:       data.is_class || (data.participant_ids && data.participant_ids.length > 1) ? 'group' : 'individual',
      p_participant_ids:  data.participant_ids ?? null,
      p_series_id:        seriesId,
    })

    if (error) {
      console.error('[createAppointmentAction] RPC error:', error)
      if (createdCount > 0) {
        return { error: `${friendlyAppointmentError(error)} Se crearon ${createdCount} de ${occurrences.length} citas de la serie antes del error.` }
      }
      return { error: friendlyAppointmentError(error) }
    }

    console.log('[createAppointmentAction] Created appointment:', newId)
    createdCount++
  }

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
    status: AppointmentStatus
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
    .update(data.status === 'cancelled' ? { ...data, cancellation_reason: 'Cancelada por el administrador.' } : data)
    .eq('id', id)
    .eq('tenant_id', tenantId!)

  if (error) return { error: friendlyAppointmentError(error) }
  revalidatePath('/admin/appointments')
  return { success: true }
}

// Hard delete — only meant for appointments that are already in a terminal
// state (cancelled/completed/no_show), where nothing further needs to be
// communicated. An active appointment must go through
// updateAppointmentStatusAction(id, 'cancelled') first, so the client/coach
// are always notified before the row can ever disappear.
export async function deleteAppointmentAction(id: string) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { error: authErr }

  const { data: existing } = await supabase
    .from('appointments')
    .select('status')
    .eq('id', id)
    .eq('tenant_id', tenantId!)
    .single()

  if (!existing) return { error: 'Cita no encontrada.' }
  if (!['cancelled', 'completed', 'no_show'].includes(existing.status)) {
    return { error: 'Solo se puede eliminar una cita cancelada, completada o marcada como no asistió.' }
  }

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId!)

  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  revalidatePath('/coach/appointments')
  return { success: true }
}

export interface AppointmentHistoryEntry {
  id: string
  old_status: AppointmentStatus | null
  new_status: AppointmentStatus
  changed_at: string
  changed_by_name: string | null
}

export async function getAppointmentHistoryAction(appointmentId: string): Promise<{ entries?: AppointmentHistoryEntry[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('appointment_status_history')
    .select('id, old_status, new_status, changed_at, changed_by, profiles(full_name)')
    .eq('appointment_id', appointmentId)
    .order('changed_at', { ascending: false })

  if (error) return { error: error.message }

  const entries: AppointmentHistoryEntry[] = (data ?? []).map((row: any) => ({
    id: row.id,
    old_status: row.old_status,
    new_status: row.new_status,
    changed_at: row.changed_at,
    changed_by_name: row.changed_by ? (row.profiles?.full_name ?? null) : null,
  }))

  return { entries }
}

// Re-sends a push reminder to one guest of an appointment (1:1 client or one
// group-class participant) who hasn't confirmed yet. Gated by the same
// grace-period rule auto_cancel_ungraced_requests() uses to auto-cancel an
// unconfirmed booking — resending past that point is pointless (the booking
// will be/was auto-cancelled) and would be misleading to the guest. Uses
// appointment.grace_hours_override for both individual and group cases as a
// simplification — the DB job actually reads the *class_template's* override
// for group classes, but that only diverges when a class has its own
// override AND the appointment row doesn't; acceptable for a UI gate that's
// re-checked server-side here (not a security boundary).
export async function resendAppointmentReminderAction(params: {
  appointmentId: string
  userId: string
  guestName: string
  appointmentTitle: string
  startTime: string
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { error: authErr }

  const [{ data: allowed }, { data: appt }, { data: tenant }] = await Promise.all([
    supabase.rpc('has_permission', { permission_code: 'appointments.manage' }),
    supabase
      .from('appointments')
      .select('grace_hours_override, coach_id')
      .eq('id', params.appointmentId)
      .eq('tenant_id', tenantId!)
      .single(),
    supabase
      .from('tenants')
      .select('appointment_grace_hours')
      .eq('id', tenantId!)
      .single(),
  ])
  if (!appt) return { error: 'Cita no encontrada' }
  // Coaches don't hold appointments.manage (deliberately — see migration
  // 20240101000188) but must still be able to resend for their own agenda.
  if (!allowed && appt.coach_id !== user.id) {
    return { error: 'No tienes permiso para reenviar notificaciones.' }
  }

  const graceHours = appt.grace_hours_override ?? tenant?.appointment_grace_hours ?? 2
  const cutoff = new Date(params.startTime).getTime() - graceHours * 3_600_000
  if (Date.now() >= cutoff) {
    return { error: 'Ya no se puede reenviar: la cita está dentro del periodo límite de confirmación.' }
  }

  const result = await queueNotification({
    userId:           params.userId,
    tenantId:         tenantId!,
    eventType:        'appointment_reminder',
    notificationType: 'appointment',
    title:            'Recordatorio de cita',
    message:          `Tu cita "${params.appointmentTitle}" aún no ha sido confirmada. Por favor confírmala.`,
    payload: {
      appointment_id: params.appointmentId,
      title:          params.appointmentTitle,
      start_time:     params.startTime,
    },
  })
  if ('error' in result) return { error: result.error }
  return { success: true }
}

