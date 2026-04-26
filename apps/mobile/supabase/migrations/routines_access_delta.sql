-- Add access control columns to routines (mirrors video access pattern)
ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS allowed_plans    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_levels   TEXT[] NOT NULL DEFAULT '{}';

-- Update client read policy to respect plan/level access
DROP POLICY IF EXISTS "client_read_assigned_routines" ON routines;

CREATE POLICY "client_read_assigned_routines" ON routines
  FOR SELECT USING (
    is_active = true
    AND tenant_id = my_tenant_id()
    AND (
      -- Directly assigned
      EXISTS (
        SELECT 1 FROM routine_assignments ra
        WHERE ra.routine_id = id AND ra.client_id = auth.uid()
      )
      OR
      -- Plan/level access (empty array = all)
      (
        (array_length(allowed_plans, 1) IS NULL OR
          (SELECT plan_tier FROM plans pl
           JOIN user_subscriptions us ON us.plan_id = pl.id
           WHERE us.user_id = auth.uid() AND us.status = 'active'
           LIMIT 1) = ANY(allowed_plans)
        )
        AND
        (array_length(allowed_levels, 1) IS NULL OR
          (SELECT client_level FROM profiles WHERE id = auth.uid()) = ANY(allowed_levels)
        )
      )
    )
  );
