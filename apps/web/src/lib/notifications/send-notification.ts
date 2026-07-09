'use server'

/**
 * Server-side helper to enqueue a notification into notification_queue.
 *
 * Uses the queue_notification() RPC which validates tenant membership
 * before inserting — safe to call from any Next.js Server Action.
 *
 * The queued rows are picked up every 5 minutes by the
 * process_notification_queue() pg_cron job and forwarded to the
 * notify-push Edge Function (Expo push delivery).
 *
 * Usage example:
 *   import { queueNotification } from '@/lib/notifications/send-notification'
 *
 *   await queueNotification({
 *     userId:   client.id,
 *     tenantId: client.tenant_id,
 *     eventType: 'appointment_confirmed',
 *     title:    'Cita confirmada',
 *     message:  'Tu cita de entrenamiento fue confirmada.',
 *     payload:  { appointment_id: appt.id },
 *   })
 */

import { createClient } from '@/lib/supabase/server'

export type NotificationEventType =
  | 'appointment_confirmed'
  | 'appointment_created'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'subscription_expiring'
  | 'plan_purchased'
  | 'plan_expired'
  | 'user_approved'
  | 'challenge_invited'
  | 'checkin_streak_milestone'

export type NotificationChannel = 'push' | 'email' | 'in_app'

export interface QueueNotificationParams {
  userId: string
  tenantId: string
  eventType: NotificationEventType
  /**
   * Delivery channel.  Defaults to 'push'.
   * 'email' and 'in_app' are accepted by the queue but currently processed
   * only by the notify-push processor — extend process_notification_queue()
   * when those channels need their own dispatch logic.
   */
  channel?: NotificationChannel
  /**
   * Short string that maps to the 'type' field in notify-push, used by the
   * mobile app to pick an icon / navigate on tap.  Defaults to 'info'.
   */
  notificationType?: string
  title: string
  message: string
  /** Arbitrary extra data forwarded to the mobile app via push payload. */
  payload?: Record<string, unknown>
}

export async function queueNotification(
  params: QueueNotificationParams,
): Promise<{ id: string } | { error: string }> {
  const {
    userId,
    tenantId,
    eventType,
    channel = 'push',
    notificationType = 'info',
    title,
    message,
    payload = {},
  } = params

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('queue_notification', {
    p_user_id:           userId,
    p_tenant_id:         tenantId,
    p_event_type:        eventType,
    p_channel:           channel,
    p_notification_type: notificationType,
    p_title:             title,
    p_message:           message,
    p_payload:           payload,
  })

  if (error) {
    console.error('[queueNotification] RPC error:', error.message)
    return { error: error.message }
  }

  return { id: data as string }
}

/**
 * Convenience wrapper: queue a push notification for an appointment event.
 */
export async function notifyAppointmentConfirmed(params: {
  userId: string
  tenantId: string
  appointmentId: string
  title: string
  startTime: string
}): Promise<void> {
  await queueNotification({
    userId:           params.userId,
    tenantId:         params.tenantId,
    eventType:        'appointment_confirmed',
    notificationType: 'appointment',
    title:            'Cita confirmada',
    message:          `Tu cita "${params.title}" fue confirmada.`,
    payload: {
      appointment_id: params.appointmentId,
      title:          params.title,
      start_time:     params.startTime,
    },
  })
}

/**
 * Convenience wrapper: queue a push notification for user approval.
 */
export async function notifyUserApproved(params: {
  userId: string
  tenantId: string
}): Promise<void> {
  await queueNotification({
    userId:           params.userId,
    tenantId:         params.tenantId,
    eventType:        'user_approved',
    notificationType: 'account',
    title:            '¡Bienvenido!',
    message:          'Tu cuenta fue aprobada. Ya puedes acceder a todos los beneficios de tu membresía.',
    payload: { user_id: params.userId },
  })
}

/**
 * Convenience wrapper: queue a push notification for expiring subscription.
 */
export async function notifySubscriptionExpiring(params: {
  userId: string
  tenantId: string
  subscriptionId: string
  planName: string
  endDate: string
}): Promise<void> {
  await queueNotification({
    userId:           params.userId,
    tenantId:         params.tenantId,
    eventType:        'subscription_expiring',
    notificationType: 'subscription',
    title:            'Tu plan está por vencer',
    message:          `Tu plan "${params.planName}" vence el ${params.endDate}. Renuévalo para no perder el acceso.`,
    payload: {
      subscription_id: params.subscriptionId,
      end_date:        params.endDate,
    },
  })
}
