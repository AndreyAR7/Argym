'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function confirmAppointmentAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/client/appointments')
  return { success: true }
}

export async function requestPostponeAction(id: string, appointmentTitle: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'postpone_requested' })
    .eq('id', id)

  if (error) return { error: error.message }

  // Best-effort push notification to admins — non-blocking
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const [profileResult, adminIdsResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.rpc('get_tenant_admin_ids'),
      ])

      const clientName = profileResult.data?.full_name ?? 'Un cliente'
      const adminIds: string[] = adminIdsResult.data ?? []

      if (adminIds.length > 0) {
        await supabase.functions.invoke('notify-push', {
          body: {
            notifications: adminIds.map((adminId) => ({
              user_id: adminId,
              title: 'Solicitud de cambio de cita',
              message: `${clientName} solicitó posponer: ${appointmentTitle}`,
              type: 'appointment_postpone_request',
            })),
          },
        })
      }
    }
  } catch {
    // Notification failure must not block the status update
  }

  revalidatePath('/client/appointments')
  return { success: true }
}
