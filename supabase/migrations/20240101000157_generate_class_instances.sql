-- Materializes bookable appointment rows from active class_templates, N
-- weeks ahead, and flips past class instances to 'completed'. No other job
-- in this system inserts future rows (existing crons only update/expire
-- already-created ones) — this is a new pattern for the recurring-class
-- model the group booking feature needs.

CREATE UNIQUE INDEX idx_appointments_class_instance
  ON public.appointments (class_template_id, start_time)
  WHERE class_template_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_class_instances(p_weeks_ahead INT DEFAULT 4)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template  RECORD;
  v_date      DATE;
  v_start     TIMESTAMPTZ;
  v_end       TIMESTAMPTZ;
  v_inserted  INT := 0;
BEGIN
  FOR v_template IN
    SELECT ct.*, t.timezone
    FROM public.class_templates ct
    JOIN public.tenants t ON t.id = ct.tenant_id
    WHERE ct.is_active = TRUE
  LOOP
    FOR v_date IN
      SELECT d::date
      FROM generate_series(
        CURRENT_DATE,
        CURRENT_DATE + ((p_weeks_ahead * 7) - 1),
        '1 day'
      ) AS d
      WHERE EXTRACT(DOW FROM d) = v_template.day_of_week
    LOOP
      v_start := (v_date + v_template.start_time) AT TIME ZONE v_template.timezone;
      v_end   := (v_date + v_template.end_time)   AT TIME ZONE v_template.timezone;

      INSERT INTO public.appointments (
        tenant_id, branch_id, coach_id, class_template_id,
        title, start_time, end_time, status, appointment_type,
        group_mode, max_participants, client_id
      ) VALUES (
        v_template.tenant_id, v_template.branch_id, v_template.coach_id, v_template.id,
        v_template.name, v_start, v_end, 'scheduled', 'in_person',
        'group', v_template.max_participants, NULL
      )
      ON CONFLICT (class_template_id, start_time) WHERE class_template_id IS NOT NULL
      DO NOTHING;

      IF FOUND THEN
        v_inserted := v_inserted + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_class_instances(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_class_instances(INT) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_past_classes_completed()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.appointments
  SET status = 'completed', updated_at = NOW()
  WHERE class_template_id IS NOT NULL
    AND status = 'scheduled'
    AND end_time < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_past_classes_completed() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_past_classes_completed() TO service_role;

SELECT cron.schedule(
  'generate-class-instances-daily',
  '0 3 * * *',
  $$SELECT public.generate_class_instances(4)$$
);

SELECT cron.schedule(
  'mark-past-classes-completed-hourly',
  '15 * * * *',
  $$SELECT public.mark_past_classes_completed()$$
);
