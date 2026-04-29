-- ═══════════════════════════════════════════════════════════════
-- Offers → Plans:  promotions now group specific plans and target
-- a client level.  Replaces the old single applies_to_plan_id.
-- ═══════════════════════════════════════════════════════════════

-- 1. Add target_level to promotions
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS target_level TEXT NOT NULL DEFAULT 'all'
  CHECK (target_level IN ('all', 'beginner', 'intermediate', 'advanced'));

-- 2. Offer ↔ Plan junction table
CREATE TABLE IF NOT EXISTS offer_plans (
  offer_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  plan_id  UUID NOT NULL REFERENCES plans(id)      ON DELETE CASCADE,
  PRIMARY KEY (offer_id, plan_id)
);

ALTER TABLE offer_plans ENABLE ROW LEVEL SECURITY;

-- Any tenant member can read offer_plans
CREATE POLICY "tenant_read_offer_plans" ON offer_plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotions pr
      JOIN profiles pf ON pf.tenant_id = pr.tenant_id
      WHERE pr.id = offer_plans.offer_id AND pf.id = auth.uid()
    )
  );

-- Only staff (admin / coach) can manage offer_plans
CREATE POLICY "staff_manage_offer_plans" ON offer_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotions pr
      JOIN user_roles ur ON ur.tenant_id = pr.tenant_id
      JOIN roles r       ON r.id = ur.role_id AND r.name IN ('admin', 'coach')
      WHERE pr.id = offer_plans.offer_id AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM promotions pr
      JOIN user_roles ur ON ur.tenant_id = pr.tenant_id
      JOIN roles r       ON r.id = ur.role_id AND r.name IN ('admin', 'coach')
      WHERE pr.id = offer_plans.offer_id AND ur.user_id = auth.uid()
    )
  );
