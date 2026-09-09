-- Analytics for appointments only ever showed tenant-wide totals — an
-- admin with 5 coaches or 3 branches had no way to see which one was
-- driving cancellations/no-shows. Adds a grouped variant reusing the same
-- fill_rate/cancellation_rate formulas as analytics_executive_kpis.

CREATE OR REPLACE FUNCTION public.analytics_appointments_by_group(
  p_tenant_id UUID,
  p_from      TIMESTAMPTZ DEFAULT '-infinity',
  p_to        TIMESTAMPTZ DEFAULT 'infinity',
  p_group_by  TEXT DEFAULT NULL -- 'coach' | 'branch' | NULL (single tenant-wide row)
)
RETURNS TABLE (
  group_label       TEXT,
  total             BIGINT,
  completed         BIGINT,
  cancelled         BIGINT,
  no_show           BIGINT,
  fill_rate         NUMERIC,
  cancellation_rate NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id AND ur.tenant_id = p.tenant_id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid() AND p.tenant_id = p_tenant_id
      AND r.name IN ('admin','superadmin')
  ) THEN RETURN; END IF;

  IF p_group_by = 'coach' THEN
    RETURN QUERY
    SELECT
      COALESCE(coach_pr.full_name, 'Sin coach asignado')::TEXT,
      COUNT(*)::BIGINT,
      COUNT(*) FILTER (WHERE a.status = 'completed')::BIGINT,
      COUNT(*) FILTER (WHERE a.status = 'cancelled')::BIGINT,
      COUNT(*) FILTER (WHERE a.status = 'no_show')::BIGINT,
      CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE a.status = 'completed')::NUMERIC / COUNT(*) * 100, 2)
           ELSE 0 END,
      CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE a.status = 'cancelled')::NUMERIC / COUNT(*) * 100, 2)
           ELSE 0 END
    FROM appointments a
    LEFT JOIN profiles coach_pr ON coach_pr.id = a.coach_id
    WHERE a.tenant_id = p_tenant_id
      AND a.start_time BETWEEN p_from AND p_to
    GROUP BY coach_pr.id, coach_pr.full_name
    ORDER BY 2 DESC;

  ELSIF p_group_by = 'branch' THEN
    RETURN QUERY
    SELECT
      COALESCE(b.name, 'Sin sucursal')::TEXT,
      COUNT(*)::BIGINT,
      COUNT(*) FILTER (WHERE a.status = 'completed')::BIGINT,
      COUNT(*) FILTER (WHERE a.status = 'cancelled')::BIGINT,
      COUNT(*) FILTER (WHERE a.status = 'no_show')::BIGINT,
      CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE a.status = 'completed')::NUMERIC / COUNT(*) * 100, 2)
           ELSE 0 END,
      CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE a.status = 'cancelled')::NUMERIC / COUNT(*) * 100, 2)
           ELSE 0 END
    FROM appointments a
    LEFT JOIN profiles client_pr ON client_pr.id = a.client_id
    LEFT JOIN branches b ON b.id = client_pr.branch_id
    WHERE a.tenant_id = p_tenant_id
      AND a.start_time BETWEEN p_from AND p_to
    GROUP BY b.id, b.name
    ORDER BY 2 DESC;

  ELSE
    RETURN QUERY
    SELECT
      'Todos'::TEXT,
      COUNT(*)::BIGINT,
      COUNT(*) FILTER (WHERE a.status = 'completed')::BIGINT,
      COUNT(*) FILTER (WHERE a.status = 'cancelled')::BIGINT,
      COUNT(*) FILTER (WHERE a.status = 'no_show')::BIGINT,
      CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE a.status = 'completed')::NUMERIC / COUNT(*) * 100, 2)
           ELSE 0 END,
      CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE a.status = 'cancelled')::NUMERIC / COUNT(*) * 100, 2)
           ELSE 0 END
    FROM appointments a
    WHERE a.tenant_id = p_tenant_id
      AND a.start_time BETWEEN p_from AND p_to;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_appointments_by_group(UUID,TIMESTAMPTZ,TIMESTAMPTZ,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.analytics_appointments_by_group(UUID,TIMESTAMPTZ,TIMESTAMPTZ,TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.analytics_appointments_by_group(UUID,TIMESTAMPTZ,TIMESTAMPTZ,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_appointments_by_group(UUID,TIMESTAMPTZ,TIMESTAMPTZ,TEXT) TO service_role;
