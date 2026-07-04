'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateTenantSettingsAction(data: {
  name: string
  timezone: string
  currency: string
  locale: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('tenants')
    .update({
      name: data.name,
      timezone: data.timezone,
      currency: data.currency,
      locale: data.locale,
    })
    .eq('id', profile!.tenant_id)

  if (error) return { error: error.message }
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function sendPushNotificationAction(data: {
  title: string
  body: string
  target_role: 'all' | 'client' | 'coach'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase.functions.invoke('notify-push', {
    body: {
      title: data.title,
      body: data.body,
      tenant_id: profile!.tenant_id,
      target_role: data.target_role === 'all' ? null : data.target_role,
    },
  })

  if (error) return { error: error.message }

  // Log the broadcast (best-effort — don't fail if insert fails)
  await supabase.from('notification_broadcasts').insert({
    tenant_id: profile!.tenant_id,
    sent_by: user.id,
    title: data.title,
    body: data.body,
    target_role: data.target_role,
  })

  revalidatePath('/admin/notifications')
  return { success: true }
}
