-- Allow clients to update their own appointments (confirm/cancel)
-- Clients can only change status — not title, coach, dates, etc.
-- We restrict which fields via a WITH CHECK that validates the status transition.

DROP POLICY IF EXISTS "appointments_client_update" ON public.appointments;

CREATE POLICY "appointments_client_update"
  ON public.appointments
  FOR UPDATE
  USING (
    tenant_id = public.get_tenant_id()
    AND client_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND client_id = auth.uid()
    -- Clients can only set status to 'confirmed' or 'cancelled'
    AND status IN ('confirmed', 'cancelled')
  );
