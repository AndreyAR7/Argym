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

export async function declineAppointmentAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/client/appointments')
  return { success: true }
}
