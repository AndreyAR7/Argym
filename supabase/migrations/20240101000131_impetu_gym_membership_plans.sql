-- Permanent, always-visible physical-gym membership plans for Ímpetu.
-- Prices are a starting placeholder — editable anytime from /admin/plans.
INSERT INTO public.plans (tenant_id, name, description, price, currency, billing_cycle, is_active, grants_physical_access, plan_tier, sort_order)
VALUES
  ('0d9a6996-d1c7-494e-a92a-72e240d1d582', 'Plan Mensual', 'Membresía mensual con acceso físico al gimnasio', 20000, 'CRC', 'monthly', true, true, 'beginner', 1),
  ('0d9a6996-d1c7-494e-a92a-72e240d1d582', 'Plan Anual', 'Membresía anual con acceso físico al gimnasio', 200000, 'CRC', 'yearly', true, true, 'beginner', 2);
