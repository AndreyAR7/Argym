'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateTenantSettingsAction(data: {
  name: string
  timezone: string
  currency: string
  locale: string
  appointment_grace_hours: number
  default_class_capacity: number
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
      appointment_grace_hours: data.appointment_grace_hours,
      default_class_capacity: data.default_class_capacity,
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
  if (!profile) return { error: 'Perfil no encontrado' }

  // Resolve recipients ourselves and queue one row per user via
  // queue_notification() — notify-push is an internal delivery worker for
  // notification_queue (gated by a webhook secret only process_notification_
  // queue's pg_cron job knows), it was never meant to be invoked directly
  // from the browser, doesn't understand a {title, body, target_role}
  // payload, and has no audience-resolution logic of its own.
  let recipientIds: string[]
  if (data.target_role === 'all') {
    const { data: rows, error: rowsErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
    if (rowsErr) return { error: rowsErr.message }
    recipientIds = (rows ?? []).map((r) => r.id)
  } else {
    const { data: rows, error: rowsErr } = await supabase.rpc('get_profiles_by_role', { role_name: data.target_role })
    if (rowsErr) return { error: rowsErr.message }
    recipientIds = ((rows ?? []) as any[])
      .filter((r) => r.approval_status === 'approved' && r.is_active !== false)
      .map((r) => r.id as string)
  }

  if (recipientIds.length === 0) return { error: 'No hay destinatarios activos para este público.' }

  const results = await Promise.all(
    recipientIds.map((uid) =>
      supabase.rpc('queue_notification', {
        p_user_id: uid,
        p_tenant_id: profile.tenant_id,
        p_event_type: 'admin_broadcast',
        p_channel: 'push',
        p_notification_type: 'broadcast',
        p_title: data.title,
        p_message: data.body,
        p_payload: {},
      }),
    ),
  )
  const queuedCount = results.filter((r) => !r.error).length
  if (queuedCount === 0) return { error: results[0]?.error?.message ?? 'No se pudo encolar la notificación.' }

  await supabase.from('notification_broadcasts').insert({
    tenant_id: profile.tenant_id,
    sent_by: user.id,
    title: data.title,
    body: data.body,
    target_role: data.target_role,
  })

  revalidatePath('/admin/notifications')
  return { success: true, recipientCount: queuedCount }
}
