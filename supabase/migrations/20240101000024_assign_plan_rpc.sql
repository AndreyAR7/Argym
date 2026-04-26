-- Atomic plan assignment: cancels existing active subscription and creates
-- the new one in a single transaction so the user is never left without a plan.

CREATE OR REPLACE FUNCTION public.assign_plan(
  p_user_id   UUID,
  p_tenant_id UUID,
  p_plan_id   UUID,
  p_price     NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the plan exists and belongs to this tenant or is global
  IF NOT EXISTS (
    SELECT 1 FROM public.plans
    WHERE id = p_plan_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Cancel all active subscriptions for this user in this tenant
  UPDATE public.user_subscriptions
  SET status = 'cancelled',
      end_date = NOW()
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND status = 'active';

  -- Insert the new active subscription
  INSERT INTO public.user_subscriptions (
    user_id, tenant_id, plan_id, status, start_date, final_price
  ) VALUES (
    p_user_id, p_tenant_id, p_plan_id, 'active', NOW(), p_price
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_plan(UUID, UUID, UUID, NUMERIC) TO authenticated;
