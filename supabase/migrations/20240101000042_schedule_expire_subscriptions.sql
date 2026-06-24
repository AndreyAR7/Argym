-- Enable pg_cron (available in all Supabase projects)
create extension if not exists pg_cron with schema extensions;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Schedule expire_subscriptions_for_expired_plans() every day at 01:00 UTC.
-- Calls the SQL function directly — no HTTP or service role key required.
select cron.schedule(
  'expire-plan-subscriptions-daily',
  '0 1 * * *',
  $$select public.expire_subscriptions_for_expired_plans()$$
);
