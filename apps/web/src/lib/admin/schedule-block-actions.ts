'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createScheduleBlockAction(data: {
  branch_id: string | null
  coach_id: string | null
  start_time: string
  end_time: string
  reason: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (!data.branch_id && !data.coach_id) {
    return { error: 'Selecciona una sucursal o un coach' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('schedule_blocks')
    .insert({
      tenant_id: profile!.tenant_id,
      branch_id: data.branch_id,
      coach_id: data.coach_id,
      start_time: data.start_time,
      end_time: data.end_time,
      reason: data.reason,
      created_by: user.id,
    })

  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  return { success: true }
}

export async function deleteScheduleBlockAction(blockId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('id', blockId)

  if (error) return { error: error.message }
  revalidatePath('/admin/appointments')
  return { success: true }
}
