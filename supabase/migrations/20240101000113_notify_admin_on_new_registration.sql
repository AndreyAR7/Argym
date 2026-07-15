-- ============================================================
-- Migration 000113: Notify admins when a new user self-registers
--
-- The admin notification bell (public.notifications table) had no
-- code path that fired on new registrations — only on appointment/
-- subscription/approval status *updates* and on measurement inserts
-- (see 20240101000085_notify_on_measurement.sql, the template this
-- follows). Admins never saw a bell alert for a brand-new pending
-- signup, only the separate pending-approvals count on the dashboard.
-- ============================================================

DROP FUNCTION IF EXISTS public.notify_staff_on_new_registration CASCADE;
CREATE OR REPLACE FUNCTION public.notify_staff_on_new_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  IF NEW.approval_status != 'pending' THEN
    RETURN NEW;
  END IF;

  FOR v_admin_id IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.tenant_id = NEW.tenant_id
      AND r.name       = 'admin'
  LOOP
    BEGIN
      INSERT INTO public.notifications (
        user_id,
        tenant_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id
      ) VALUES (
        v_admin_id,
        NEW.tenant_id,
        'user_registered',
        'Nuevo registro pendiente',
        COALESCE(NEW.full_name, 'Un nuevo usuario') || ' se registró y espera aprobación.',
        'profile',
        NEW.id
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never fail the registration if notification creation fails
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_new_registration ON public.profiles;
CREATE TRIGGER trg_notify_staff_on_new_registration
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_staff_on_new_registration();
