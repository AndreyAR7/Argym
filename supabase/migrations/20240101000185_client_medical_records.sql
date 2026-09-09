-- Private medical/legal data repository — injuries, conditions, allergies,
-- emergency contact and a liability acknowledgment. A client can fill it
-- themselves, or a coach/admin can fill it on their behalf. Deliberately a
-- separate table, not columns on profiles: the existing
-- profiles_tenant_isolation policy lets any authenticated user in a
-- tenant SELECT every column of every other profile (it's how
-- coach/client pickers work everywhere in this app) — sensitive data
-- living on that row would leak to every tenant-mate on day one (same
-- reasoning as 20240101000180_ical_feed_token.sql).

CREATE TABLE public.client_medical_records (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                       UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id                       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  blood_type                      TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  conditions                      TEXT,
  injuries                        TEXT,
  allergies                       TEXT,
  medications                     TEXT,
  physical_limitations            TEXT,
  emergency_contact_name          TEXT,
  emergency_contact_phone         TEXT,
  emergency_contact_relationship  TEXT,
  has_medical_clearance           BOOLEAN NOT NULL DEFAULT FALSE,
  liability_acknowledged          BOOLEAN NOT NULL DEFAULT FALSE,
  status                          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  filled_by                       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  filled_by_role                  TEXT CHECK (filled_by_role IN ('client','staff')),
  completed_at                    TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX client_medical_records_tenant_idx ON public.client_medical_records (tenant_id);

ALTER TABLE public.client_medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medical_client_own" ON public.client_medical_records
  FOR ALL
  USING (client_id = auth.uid() AND tenant_id = public.get_tenant_id())
  WITH CHECK (client_id = auth.uid() AND tenant_id = public.get_tenant_id());

CREATE POLICY "medical_staff_manage" ON public.client_medical_records
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'));

CREATE TRIGGER client_medical_records_updated_at
  BEFORE UPDATE ON public.client_medical_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
