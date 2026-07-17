-- seed_tenant_defaults() also referenced stale columns on email_templates
-- (body, event_type — real columns are body_html, variables; event_type
-- lives on communication_rules only) and communication_rules (channel —
-- real column is recipients; name is NOT NULL and was missing). It also
-- used event_type values that don't match this schema's real vocabulary
-- (confirmed via existing CaroGym rows: client.welcome, client.approved,
-- plan.purchased, appointment.reminder). Fixing all of it in one pass.

CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_welcome_template_id  UUID;
  v_approved_template_id UUID;
  v_payment_template_id  UUID;
  v_reminder_template_id UUID;
BEGIN
  -- ── Default branch ─────────────────────────────────────────────────────────
  INSERT INTO public.branches (tenant_id, name, address)
  VALUES (p_tenant_id, 'Principal', '')
  ON CONFLICT DO NOTHING;

  -- ── Email templates ────────────────────────────────────────────────────────
  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id,
    'Bienvenida',
    '¡Bienvenido/a a {{gym_name}}!',
    '<h2>¡Hola {{client_name}}!</h2>
<p>Tu cuenta en <strong>{{gym_name}}</strong> ha sido creada exitosamente.</p>
<p>Tu solicitud está en revisión. Te notificaremos cuando sea aprobada.</p>
<p>Saludos,<br/>El equipo de {{gym_name}}</p>',
    ARRAY['gym_name', 'client_name']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_welcome_template_id;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id,
    'Cuenta aprobada',
    '¡Tu cuenta en {{gym_name}} fue aprobada!',
    '<h2>¡Hola {{client_name}}!</h2>
<p>Tu cuenta en <strong>{{gym_name}}</strong> ha sido aprobada. Ya puedes iniciar sesión.</p>
<p>Accede desde: <a href="{{app_url}}">{{app_url}}</a></p>
<p>Saludos,<br/>El equipo de {{gym_name}}</p>',
    ARRAY['gym_name', 'client_name', 'app_url']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_approved_template_id;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id,
    'Confirmación de pago',
    'Recibo de pago — {{gym_name}}',
    '<h2>Pago recibido</h2>
<p>Hola {{client_name}}, confirmamos el pago de tu plan <strong>{{plan_name}}</strong>.</p>
<p>Monto: <strong>{{amount}}</strong><br/>Período: {{start_date}} – {{end_date}}</p>
<p>Gracias por confiar en {{gym_name}}.</p>',
    ARRAY['gym_name', 'client_name', 'plan_name', 'amount', 'start_date', 'end_date']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_payment_template_id;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id,
    'Recordatorio de cita',
    'Recordatorio: tienes una cita hoy en {{gym_name}}',
    '<h2>Recordatorio de cita</h2>
<p>Hola {{client_name}}, te recordamos que tienes una cita hoy:</p>
<ul>
  <li><strong>Fecha:</strong> {{appointment_date}}</li>
  <li><strong>Hora:</strong> {{appointment_time}}</li>
  <li><strong>Coach:</strong> {{coach_name}}</li>
</ul>
<p>¡Te esperamos en {{gym_name}}!</p>',
    ARRAY['gym_name', 'client_name', 'appointment_date', 'appointment_time', 'coach_name']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_reminder_template_id;

  -- ── Communication rules (link templates to event types) ───────────────────
  IF v_welcome_template_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Bienvenida', 'client.welcome', v_welcome_template_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_approved_template_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Cuenta aprobada', 'client.approved', v_approved_template_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_payment_template_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Confirmación de pago', 'plan.purchased', v_payment_template_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_reminder_template_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Recordatorio de cita', 'appointment.reminder', v_reminder_template_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_defaults(UUID) TO service_role;
