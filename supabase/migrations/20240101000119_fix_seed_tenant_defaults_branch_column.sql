-- seed_tenant_defaults() referenced branches.is_main, which never existed
-- (branches only has id/tenant_id/name/address/phone/email/is_active/...).
-- Since a PL/pgSQL function body is one transaction, that error rolled back
-- the ENTIRE function every time a tenant was created via /super-admin —
-- no default branch, no email templates, no communication rules — silently,
-- since createTenantAction only console.error's on failure. Confirmed this
-- is exactly what happened to the "Impetú" tenant (zero branches).

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
  INSERT INTO public.email_templates (tenant_id, name, subject, body, event_type)
  VALUES (
    p_tenant_id,
    'Bienvenida',
    '¡Bienvenido/a a {{gym_name}}!',
    '<h2>¡Hola {{client_name}}!</h2>
<p>Tu cuenta en <strong>{{gym_name}}</strong> ha sido creada exitosamente.</p>
<p>Tu solicitud está en revisión. Te notificaremos cuando sea aprobada.</p>
<p>Saludos,<br/>El equipo de {{gym_name}}</p>',
    'user.registered'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_welcome_template_id;

  INSERT INTO public.email_templates (tenant_id, name, subject, body, event_type)
  VALUES (
    p_tenant_id,
    'Cuenta aprobada',
    '¡Tu cuenta en {{gym_name}} fue aprobada!',
    '<h2>¡Hola {{client_name}}!</h2>
<p>Tu cuenta en <strong>{{gym_name}}</strong> ha sido aprobada. Ya puedes iniciar sesión.</p>
<p>Accede desde: <a href="{{app_url}}">{{app_url}}</a></p>
<p>Saludos,<br/>El equipo de {{gym_name}}</p>',
    'user.approved'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_approved_template_id;

  INSERT INTO public.email_templates (tenant_id, name, subject, body, event_type)
  VALUES (
    p_tenant_id,
    'Confirmación de pago',
    'Recibo de pago — {{gym_name}}',
    '<h2>Pago recibido</h2>
<p>Hola {{client_name}}, confirmamos el pago de tu plan <strong>{{plan_name}}</strong>.</p>
<p>Monto: <strong>{{amount}}</strong><br/>Período: {{start_date}} – {{end_date}}</p>
<p>Gracias por confiar en {{gym_name}}.</p>',
    'payment.success'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_payment_template_id;

  INSERT INTO public.email_templates (tenant_id, name, subject, body, event_type)
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
    'appointment.reminder'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_reminder_template_id;

  -- ── Communication rules (link templates to event types) ───────────────────
  IF v_welcome_template_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, event_type, template_id, channel, is_active)
    VALUES (p_tenant_id, 'user.registered', v_welcome_template_id, 'email', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_approved_template_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, event_type, template_id, channel, is_active)
    VALUES (p_tenant_id, 'user.approved', v_approved_template_id, 'email', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_payment_template_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, event_type, template_id, channel, is_active)
    VALUES (p_tenant_id, 'payment.success', v_payment_template_id, 'email', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_reminder_template_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, event_type, template_id, channel, is_active)
    VALUES (p_tenant_id, 'appointment.reminder', v_reminder_template_id, 'email', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_defaults(UUID) TO service_role;
