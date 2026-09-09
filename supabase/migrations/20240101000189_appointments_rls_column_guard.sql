-- appointments currently has only 2 RLS policies: appointments_admin_all
-- (has_permission('appointments.manage')) and appointments_own (FOR ALL,
-- client_id = auth.uid() OR coach_id = auth.uid(), no restriction at
-- all). This means, right now, a client can UPDATE any column of their
-- own appointment — including reassigning coach_id, rewriting the
-- title, or setting status to anything — not just confirm/cancel/
-- request-postpone as the UI implies. A coach can likewise rewrite any
-- column and hard-DELETE their own appointments directly, bypassing the
-- admin-only cancel-then-delete workflow entirely. Earlier migrations
-- (000012, 000057) once had narrower per-command policies for exactly
-- this, but they were dropped along the way and never recreated — the
-- same "DROP ... CASCADE never recreated" class of bug already found
-- for triggers (000112) and other RLS policies, recurring here.
--
-- Fix: split appointments_own into SELECT/INSERT/UPDATE (no DELETE —
-- deleting is admin-only via appointments_admin_all going forward), and
-- add a BEFORE UPDATE trigger enforcing which columns a non-admin
-- client/coach may actually change, since RLS's WITH CHECK alone can't
-- compare NEW against OLD to block "also changed other columns" attempts.

DROP POLICY IF EXISTS "appointments_own" ON public.appointments;

CREATE POLICY "appointments_own_select" ON public.appointments
  FOR SELECT
  USING ((client_id = auth.uid() OR coach_id = auth.uid()) AND tenant_id = public.get_tenant_id());

CREATE POLICY "appointments_own_insert" ON public.appointments
  FOR INSERT
  WITH CHECK ((client_id = auth.uid() OR coach_id = auth.uid()) AND tenant_id = public.get_tenant_id());

CREATE POLICY "appointments_own_update" ON public.appointments
  FOR UPDATE
  USING ((client_id = auth.uid() OR coach_id = auth.uid()) AND tenant_id = public.get_tenant_id())
  WITH CHECK ((client_id = auth.uid() OR coach_id = auth.uid()) AND tenant_id = public.get_tenant_id());

CREATE OR REPLACE FUNCTION public.protect_appointment_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin/full_access (has appointments.manage) is unrestricted.
  IF public.has_permission('appointments.manage') THEN
    RETURN NEW;
  END IF;

  IF OLD.client_id = auth.uid() THEN
    -- Client: may only move status to one of these three values —
    -- matches the confirm/decline/request-postpone actions in the UI.
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('confirmed', 'cancelled', 'postpone_requested') THEN
      RAISE EXCEPTION 'No puedes cambiar la cita a este estado.';
    END IF;
    IF NEW.title            IS DISTINCT FROM OLD.title
    OR NEW.description      IS DISTINCT FROM OLD.description
    OR NEW.start_time       IS DISTINCT FROM OLD.start_time
    OR NEW.end_time         IS DISTINCT FROM OLD.end_time
    OR NEW.coach_id         IS DISTINCT FROM OLD.coach_id
    OR NEW.client_id        IS DISTINCT FROM OLD.client_id
    OR NEW.appointment_type IS DISTINCT FROM OLD.appointment_type
    OR NEW.location         IS DISTINCT FROM OLD.location
    OR NEW.meeting_url      IS DISTINCT FROM OLD.meeting_url
    THEN
      RAISE EXCEPTION 'Solo puedes confirmar, cancelar o solicitar reprogramar esta cita.';
    END IF;
  ELSIF OLD.coach_id = auth.uid() THEN
    -- Coach: everything except identity/type/tenant fields — matches
    -- updateCoachAppointmentAction's reduced field set.
    IF NEW.title            IS DISTINCT FROM OLD.title
    OR NEW.coach_id         IS DISTINCT FROM OLD.coach_id
    OR NEW.client_id        IS DISTINCT FROM OLD.client_id
    OR NEW.tenant_id        IS DISTINCT FROM OLD.tenant_id
    OR NEW.appointment_type IS DISTINCT FROM OLD.appointment_type
    THEN
      RAISE EXCEPTION 'No puedes cambiar estos campos de la cita.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_appointment_columns ON public.appointments;
CREATE TRIGGER trg_protect_appointment_columns
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.protect_appointment_columns();

-- get_client_appointment_stats(): let the client's assigned coach call
-- it too, without handing coach the tenant-wide appointments.manage
-- permission (which appointments_admin_all would otherwise turn into
-- full read/write access to every appointment in the tenant).
CREATE OR REPLACE FUNCTION public.get_client_appointment_stats(p_client_id UUID)
RETURNS TABLE (attended_count INT, cancelled_count INT, no_show_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_client_id;

  IF v_tenant_id IS NULL OR v_tenant_id IS DISTINCT FROM public.get_tenant_id()
     OR NOT (
       public.has_permission('appointments.manage')
       OR EXISTS (
         SELECT 1 FROM public.coach_client_assignments
         WHERE coach_id = auth.uid() AND client_id = p_client_id
       )
     )
  THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    (
      (SELECT COUNT(*) FROM public.appointments
        WHERE client_id = p_client_id AND class_template_id IS NULL AND status = 'completed')
      +
      (SELECT COUNT(*) FROM public.appointment_participants
        WHERE user_id = p_client_id AND status = 'attended')
    )::INT AS attended_count,
    (
      (SELECT COUNT(*) FROM public.appointments
        WHERE client_id = p_client_id AND class_template_id IS NULL AND status = 'cancelled')
      +
      (SELECT COUNT(*) FROM public.appointment_participants
        WHERE user_id = p_client_id AND status = 'cancelled')
    )::INT AS cancelled_count,
    (
      (SELECT COUNT(*) FROM public.appointments
        WHERE client_id = p_client_id AND class_template_id IS NULL AND status = 'no_show')
      +
      (SELECT COUNT(*) FROM public.appointment_participants
        WHERE user_id = p_client_id AND status = 'no_show')
    )::INT AS no_show_count;
END;
$$;
