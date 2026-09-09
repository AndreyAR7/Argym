-- No audit trail existed for why an appointment ended up in a given
-- status (client didn't confirm in time? admin cancelled it? auto-cancel
-- grace period? the new auto no-show job?) — admins had to guess. Adds a
-- history table + trigger that records every status transition.

CREATE TABLE public.appointment_status_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID      NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  old_status   appointment_status,
  new_status   appointment_status NOT NULL,
  changed_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointment_status_history_appointment ON public.appointment_status_history(appointment_id, changed_at DESC);

ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;

-- Same visibility rule as the appointment itself: admin/full_access see
-- every history row in their tenant; a coach/client only sees history for
-- an appointment they're the coach/client/participant of.
CREATE POLICY "appointment_status_history_read" ON public.appointment_status_history
  FOR SELECT
  USING (
    tenant_id = public.get_tenant_id_or_null()
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles ro ON ro.id = ur.role_id
        WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id
          AND ro.name = ANY (ARRAY['admin', 'full_access'])
      )
      OR EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.id = appointment_id
          AND (a.coach_id = auth.uid() OR a.client_id = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.appointment_participants ap
        WHERE ap.appointment_id = appointment_status_history.appointment_id AND ap.user_id = auth.uid()
      )
    )
  );

-- No INSERT policy for regular roles — only the trigger (SECURITY DEFINER,
-- bypasses RLS) ever writes to this table, so history can't be forged or
-- deleted by a client-side call.

CREATE OR REPLACE FUNCTION public.record_appointment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.appointment_status_history (appointment_id, tenant_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NEW.tenant_id, OLD.status, NEW.status, auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.appointment_status_history (appointment_id, tenant_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NEW.tenant_id, NULL, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the appointment write over an audit-log failure.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_appointment_status_change ON public.appointments;
CREATE TRIGGER on_appointment_status_change
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.record_appointment_status_change();
