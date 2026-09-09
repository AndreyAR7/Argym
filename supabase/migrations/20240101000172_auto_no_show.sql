-- Until now, no_show was 100% manual — nobody flips a 'confirmed'
-- appointment to 'no_show' unless a coach/admin remembers to do it after
-- the fact. Adds an hourly job (same pg_cron pattern as
-- auto-cancel-ungraced-appointments / mark-past-classes-completed-hourly)
-- that marks a 'confirmed' appointment as 'no_show' once its end_time is
-- more than 2 hours in the past and nobody ever marked it 'completed'.
-- Only touches 1:1 appointments (class_template_id IS NULL) — group class
-- attendance is tracked per participant via mark_class_attendance, not on
-- the appointment row itself.

CREATE OR REPLACE FUNCTION public.mark_stale_confirmed_as_no_show()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.appointments
  SET status = 'no_show', updated_at = NOW()
  WHERE class_template_id IS NULL
    AND status = 'confirmed'
    AND end_time < NOW() - INTERVAL '2 hours';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_stale_confirmed_as_no_show() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_stale_confirmed_as_no_show() TO service_role;

SELECT cron.schedule(
  'mark-stale-confirmed-as-no-show-hourly',
  '20 * * * *',
  $$SELECT public.mark_stale_confirmed_as_no_show()$$
);
