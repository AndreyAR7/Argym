import { supabase } from '@/lib/supabase';

export type NotificationType =
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_completed'
  | 'appointment_rescheduled';

export interface AppNotification {
  id: string;
  user_id: string;
  tenant_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CreateNotificationInput {
  user_id: string;
  tenant_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  // role is included in push payload so the tap handler can navigate correctly
  role?: 'admin' | 'coach' | 'client';
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

async function sendPushNotifications(inputs: CreateNotificationInput[]): Promise<void> {
  if (!SUPABASE_URL || inputs.length === 0) return;
  const { data: { session } } = await supabase.auth.getSession();
  await fetch(`${SUPABASE_URL}/functions/v1/notify-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ notifications: inputs }),
  });
}

export async function createNotifications(inputs: CreateNotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;

  const tenantId = inputs[0].tenant_id;

  const { error } = await supabase.rpc('create_notifications_for_users', {
    p_tenant_id: tenantId,
    p_rows: inputs,
  });

  if (error) {
    // Non-fatal — appointment was already created
    return;
  }

  // Send push notifications in the background after DB insert succeeds
  sendPushNotifications(inputs).catch(() => {});
}

export async function getNotificationsForUser(
  userId: string,
  page = 0,
  pageSize = 20,
): Promise<AppNotification[]> {
  // Auto-delete read notifications older than 3 days (fire and forget)
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', true)
    .lt('created_at', cutoff)
    .then(() => {});

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('is_read', { ascending: true })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}
