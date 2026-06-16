import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { notifications } = await req.json();
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: CORS });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, serviceKey);

    // Collect unique user IDs from the payload
    const userIds: string[] = [...new Set(notifications.map((n: any) => n.user_id as string))];

    // Fetch active push tokens for those users
    const { data: rows, error } = await db
      .from('device_tokens')
      .select('user_id, token')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (error) throw error;
    if (!rows?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), { status: 200, headers: CORS });
    }

    // Map user_id → [tokens]
    const tokenMap = new Map<string, string[]>();
    for (const row of rows) {
      const list = tokenMap.get(row.user_id) ?? [];
      list.push(row.token);
      tokenMap.set(row.user_id, list);
    }

    // Build Expo push messages
    const messages: any[] = [];
    for (const notif of notifications) {
      const tokens = tokenMap.get(notif.user_id) ?? [];
      for (const to of tokens) {
        messages.push({
          to,
          title: notif.title,
          body: notif.message,
          sound: 'default',
          priority: 'high',
          data: {
            type: notif.type ?? '',
            role: notif.role ?? '',
            related_entity_type: notif.related_entity_type ?? '',
            related_entity_id:   notif.related_entity_id   ?? '',
          },
        });
      }
    }

    if (!messages.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: CORS });
    }

    // Expo accepts up to 100 messages per request
    let sent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'unknown' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
