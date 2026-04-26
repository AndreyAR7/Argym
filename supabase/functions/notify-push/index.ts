import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// JWT verification is disabled for this function (set in config.toml).
// The function is only called from our own service layer, never directly by users.

interface NotificationInput {
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

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
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

  // Use service role to bypass RLS when reading device tokens
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const userIds = [...new Set(notifications.map((n) => n.user_id))];

  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('user_id, token')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (error || !tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build a map: user_id → tokens[]
  const tokenMap = new Map<string, string[]>();
  for (const row of tokens as DeviceToken[]) {
    const list = tokenMap.get(row.user_id) ?? [];
    list.push(row.token);
    tokenMap.set(row.user_id, list);
  }

  // Build Expo push messages
  const messages: ExpoPushMessage[] = [];
  for (const notif of notifications) {
    const userTokens = tokenMap.get(notif.user_id) ?? [];
    for (const to of userTokens) {
      messages.push({
        to,
        title: notif.title,
        body: notif.message,
        sound: 'default',
        data: { type: notif.type, role: notif.role },
      });
    }
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send to Expo Push API in chunks of 100 (API limit)
  const CHUNK_SIZE = 100;
  let sent = 0;
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(chunk),
    });
    if (res.ok) sent += chunk.length;
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
