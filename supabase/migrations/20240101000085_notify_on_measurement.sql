-- ============================================================
-- Migration 000085: Notify staff when a client logs a measurement
--
-- Creates an AFTER INSERT trigger on body_measurements that
-- inserts a notification row for every admin and coach in the
-- same tenant.  Uses SECURITY DEFINER so the function can write
-- to notifications regardless of the caller's RLS context.
-- ============================================================

DROP FUNCTION IF EXISTS public.notify_staff_on_measurement CASCADE;
CREATE OR REPLACE FUNCTION public.notify_staff_on_measurement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;
  v_staff_id    UUID;
BEGIN
  -- Resolve client display name
  SELECT full_name INTO v_client_name
  FROM public.profiles
  WHERE id = NEW.client_id;

  -- Notify every admin and coach in the same tenant (skip the client themselves)
  FOR v_staff_id IN
    SELECT DISTINCT p.id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = NEW.tenant_id
    JOIN public.roles r        ON r.id = ur.role_id
    WHERE p.tenant_id = NEW.tenant_id
      AND p.id        != NEW.client_id
      AND r.name      IN ('admin', 'coach')
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
        v_staff_id,
        NEW.tenant_id,
        'info',
        'Nueva medición registrada',
        COALESCE(v_client_name, 'Un cliente') || ' registró sus medidas corporales.',
        'body_measurement',
        NEW.id
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never fail the measurement insert if notification creation fails
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop previous version of the trigger if it exists
DROP TRIGGER IF EXISTS trg_notify_staff_on_measurement ON public.body_measurements;

CREATE TRIGGER trg_notify_staff_on_measurement
  AFTER INSERT ON public.body_measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_staff_on_measurement();
