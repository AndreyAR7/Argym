-- Fix: allow clients to read exercises of routines they can access
-- The previous policy only checked routine_assignments, missing plan/level access

DROP POLICY IF EXISTS "client_read_exercises" ON exercises;

CREATE POLICY "client_read_exercises" ON exercises
  FOR SELECT USING (
    tenant_id = my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM routines r
      WHERE r.id = routine_id
        AND r.is_active = true
        AND r.tenant_id = my_tenant_id()
        AND (
          -- Directly assigned
          EXISTS (
            SELECT 1 FROM routine_assignments ra
            WHERE ra.routine_id = r.id AND ra.client_id = auth.uid()
          )
          OR
          -- Plan/level access
          (
            (array_length(r.allowed_plans, 1) IS NULL OR r.allowed_plans = '{}' OR
              (SELECT plan_tier FROM plans pl
               JOIN user_subscriptions us ON us.plan_id = pl.id
               WHERE us.user_id = auth.uid() AND us.status = 'active'
               LIMIT 1) = ANY(r.allowed_plans)
            )
            AND
            (array_length(r.allowed_levels, 1) IS NULL OR r.allowed_levels = '{}' OR
              (SELECT client_level FROM profiles WHERE id = auth.uid()) = ANY(r.allowed_levels)
            )
          )
        )
    )
  );

-- Also ensure staff can read exercises (needed for admin view)
DROP POLICY IF EXISTS "staff_all_exercises" ON exercises;

CREATE POLICY "staff_all_exercises" ON exercises
  FOR ALL USING (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id))
  WITH CHECK (tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id));
