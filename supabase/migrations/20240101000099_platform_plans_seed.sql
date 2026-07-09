-- ─────────────────────────────────────────────────────────────────────────────
-- 000099 · Platform plans seed (sin Stripe)
-- Planes que ARGYM ofrece a los gimnasios. Sin stripe_price_id ya que
-- la facturación es manual gestionada por el super-admin.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.subscription_plans (
  name, price_monthly, price_yearly, currency,
  modules, max_clients, max_staff,
  is_active, is_platform_plan, trial_days
)
VALUES
  (
    'Starter',
    49.00, 470.00, 'USD',
    ARRAY['appointments','plans','videos'],
    50, 5,
    TRUE, TRUE, 30
  ),
  (
    'Pro',
    99.00, 950.00, 'USD',
    ARRAY['appointments','plans','videos','gamification','nutrition','challenges','analytics'],
    200, 20,
    TRUE, TRUE, 14
  ),
  (
    'Business',
    199.00, 1910.00, 'USD',
    ARRAY['appointments','plans','videos','gamification','nutrition','challenges','analytics','multi_branch','priority_support'],
    NULL, NULL,
    TRUE, TRUE, 0
  )
ON CONFLICT DO NOTHING;
