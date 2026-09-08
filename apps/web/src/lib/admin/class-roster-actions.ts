'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function confirmClassSpotAction(participantId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('confirm_class_spot', { p_participant_id: participantId })
  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  return { success: true }
}

export async function markClassAttendanceAction(participantId: string, status: 'attended' | 'no_show') {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_class_attendance', {
    p_participant_id: participantId,
    p_status: status,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  return { success: true }
}
