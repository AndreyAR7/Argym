-- Fix exercises RLS: allow clients to read exercises for all accessible routines,
-- not just directly assigned ones. Mirrors the routines_access_delta.sql policy.

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
          -- Directly assigned to this client
          EXISTS (
            SELECT 1 FROM routine_assignments ra
            WHERE ra.routine_id = r.id AND ra.client_id = auth.uid()
          )
          OR
          -- Accessible by plan/level (empty array = open to all)
          (
            (
              array_length(r.allowed_plans, 1) IS NULL
              OR (
                SELECT pl.plan_tier FROM plans pl
                JOIN user_subscriptions us ON us.plan_id = pl.id
                WHERE us.user_id = auth.uid() AND us.status = 'active'
                LIMIT 1
              ) = ANY(r.allowed_plans)
            )
            AND
            (
              array_length(r.allowed_levels, 1) IS NULL
              OR (
                SELECT client_level FROM profiles WHERE id = auth.uid()
              ) = ANY(r.allowed_levels)
            )
          )
        )
    )
  );
