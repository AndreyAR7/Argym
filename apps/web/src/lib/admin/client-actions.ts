'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateClientProfileAction(
  clientId: string,
  data: { full_name: string; phone: string | null; client_level: string | null },
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      phone: data.phone,
      client_level: data.client_level,
    })
    .eq('id', clientId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/clients')
  return { success: true }
}

export async function toggleClientActiveAction(clientId: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', clientId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/clients')
  return { success: true }
}

export async function approveClientAction(clientId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ approval_status: 'approved' })
    .eq('id', clientId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/clients')
  revalidatePath('/admin/approvals')
  return { success: true }
}

export async function rejectClientAction(clientId: string, reason: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ approval_status: 'rejected' })
    .eq('id', clientId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/approvals')
  return { success: true }
}
