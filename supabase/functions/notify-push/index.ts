import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// JWT verification is disabled for this function (set in config.toml), so it
// must authenticate itself: only process_notification_queue() (a DB cron job)
// calls this, and it already sends x-webhook-secret — see
// supabase/migrations/20240101000095_notification_triggers.sql.

interface NotificationInput {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  role?: string;
}

interface DeviceToken {
  token: string;
  user_id: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Use service role to bypass RLS when reading device tokens
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const webhookSecret = req.headers.get('x-webhook-secret');
  const { data: expectedSecret } = await supabase.rpc('get_webhook_secret') as { data: string | null };
  if (!webhookSecret || !expectedSecret || webhookSecret !== expectedSecret) {
    return new Response('Forbidden', { status: 403 });
  }

  let notifications: NotificationInput[];
  try {
    const body = await req.json();
    notifications = body.notifications ?? [];
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (notifications.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userIds = [...new Set(notifications.map((n) => n.user_id))];

  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('user_id, token')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (error) {
    // Can't tell which notifications succeeded — leave them 'processing' so
    // the stale-processing sweep in process_notification_queue retries them,
    // rather than guessing 'sent' or 'failed'.
    return new Response(JSON.stringify({ sent: 0, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build a map: user_id → tokens[]
  const tokenMap = new Map<string, string[]>();
  for (const row of (tokens ?? []) as DeviceToken[]) {
    const list = tokenMap.get(row.user_id) ?? [];
    list.push(row.token);
    tokenMap.set(row.user_id, list);
  }

  // Build Expo push messages, remembering which notification_queue id and
  // token each message came from so Expo's per-message ticket can be routed
  // back to the right queue row / device token.
  const messages: ExpoPushMessage[] = [];
  const messageMeta: { notificationId: string; token: string }[] = [];
  const notifIdsWithNoToken: string[] = [];

  for (const notif of notifications) {
    const userTokens = tokenMap.get(notif.user_id) ?? [];
    if (userTokens.length === 0) {
      notifIdsWithNoToken.push(notif.id);
      continue;
    }
    for (const to of userTokens) {
      messages.push({
        to,
        title: notif.title,
        body: notif.message,
        sound: 'default',
        data: { type: notif.type, role: notif.role },
      });
      messageMeta.push({ notificationId: notif.id, token: to });
    }
  }

  // Notifications for users with no registered/active device — nothing to
  // send, so nothing will ever come back from Expo for them. Fail fast
  // instead of leaving them stuck in 'processing'.
  if (notifIdsWithNoToken.length > 0) {
    await supabase
      .from('notification_queue')
      .update({ status: 'failed', processed_at: new Date().toISOString(), error_msg: 'no active device tokens' })
      .in('id', notifIdsWithNoToken);
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send to Expo Push API in chunks of 100 (API limit), collecting the
  // per-message delivery ticket Expo returns for each chunk.
  const CHUNK_SIZE = 100;
  const tickets: (ExpoPushTicket | null)[] = new Array(messages.length).fill(null);
  let sent = 0;

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });
      if (res.ok) {
        const json = await res.json().catch(() => null) as { data?: ExpoPushTicket[] } | null;
        const chunkTickets = json?.data ?? [];
        for (let j = 0; j < chunk.length; j++) {
          tickets[i + j] = chunkTickets[j] ?? { status: 'error', message: 'missing ticket in Expo response' };
        }
      } else {
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        for (let j = 0; j < chunk.length; j++) {
          tickets[i + j] = { status: 'error', message: errText };
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (let j = 0; j < chunk.length; j++) {
        tickets[i + j] = { status: 'error', message: msg };
      }
    }
  }

  // Aggregate per-notification outcome (a notification can fan out to
  // several tokens/devices for the same user — count it delivered if any
  // one of them succeeded), and collect tokens Expo says are dead.
  const outcomeByNotifId = new Map<string, { ok: boolean; error?: string }>();
  const deadTokens: string[] = [];

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const meta = messageMeta[i];
    if (!ticket || !meta) continue;

    if (ticket.status === 'ok') {
      sent++;
      outcomeByNotifId.set(meta.notificationId, { ok: true });
    } else {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        deadTokens.push(meta.token);
      }
      const prev = outcomeByNotifId.get(meta.notificationId);
      if (!prev?.ok) {
        outcomeByNotifId.set(meta.notificationId, { ok: false, error: ticket.message ?? ticket.details?.error });
      }
    }
  }

  if (deadTokens.length > 0) {
    await supabase
      .from('device_tokens')
      .update({ is_active: false })
      .in('token', deadTokens);
  }

  const sentIds = [...outcomeByNotifId.entries()].filter(([, o]) => o.ok).map(([id]) => id);
  const failedIds = [...outcomeByNotifId.entries()].filter(([, o]) => !o.ok).map(([id]) => id);

  if (sentIds.length > 0) {
    await supabase
      .from('notification_queue')
      .update({ status: 'sent', processed_at: new Date().toISOString() })
      .in('id', sentIds);
  }
  if (failedIds.length > 0) {
    await supabase
      .from('notification_queue')
      .update({ status: 'failed', processed_at: new Date().toISOString(), error_msg: 'Expo push rejected all tokens for this notification' })
      .in('id', failedIds);
  }

  return new Response(JSON.stringify({ sent, deactivatedTokens: deadTokens.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
