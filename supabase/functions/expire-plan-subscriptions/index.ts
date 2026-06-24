import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Cron Edge Function — runs daily at 01:00 UTC.
// Expires all active user_subscriptions whose plan.expiry_date has passed.
//
// Schedule this in the Supabase dashboard:
//   Edge Functions → expire-plan-subscriptions → Schedule → "0 1 * * *"

Deno.serve(async (req: Request) => {
  // Allow manual POST triggers (e.g. from admin panel) in addition to cron
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase.rpc('expire_subscriptions_for_expired_plans');

  if (error) {
    console.error('[expire-plan-subscriptions] error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const affected = data as number;
  console.log(`[expire-plan-subscriptions] expired ${affected} subscription(s)`);

  return new Response(JSON.stringify({ success: true, expired: affected }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
