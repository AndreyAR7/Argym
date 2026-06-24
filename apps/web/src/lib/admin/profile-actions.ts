'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateMyProfileAction(data: {
  full_name: string
  phone: string | null
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: data.full_name, phone: data.phone })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/admin/profile')
  return { success: true }
}

export async function updateMyAvatarAction(
  avatarUrl: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/admin/profile')
  return { success: true }
}
