-- Body measurements for client progress tracking
CREATE TABLE IF NOT EXISTS body_measurements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL,
  tenant_id       UUID NOT NULL,
  measured_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg       NUMERIC(5,2),
  height_cm       NUMERIC(5,1),
  body_fat_pct    NUMERIC(4,1),
  muscle_mass_kg  NUMERIC(5,2),
  waist_cm        NUMERIC(5,1),
  chest_cm        NUMERIC(5,1),
  hip_cm          NUMERIC(5,1),
  arm_cm          NUMERIC(5,1),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, measured_at)
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_own_measurements" ON body_measurements
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY "staff_view_tenant_measurements" ON body_measurements
  FOR SELECT USING (
    tenant_id = my_tenant_id() AND is_staff_in_tenant(tenant_id)
  );
