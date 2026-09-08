-- Add a real 3-month billing cycle. "Trimestral" plans were being
-- represented as billing_cycle = 'one_time', which subscription_end_date()
-- treats as "never expires" (correct for lifetime passes, wrong for a
-- fixed-term membership) — meaning quarterly memberships assigned manually
-- or purchased in the app never actually lapsed after 3 months.
--
-- ALTER TYPE ... ADD VALUE must be committed before the new value can be
-- used elsewhere, so this is a standalone migration — see 000154 for the
-- functions that use it.
ALTER TYPE billing_cycle_type ADD VALUE IF NOT EXISTS 'quarterly';
