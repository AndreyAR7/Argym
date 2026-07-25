-- ============================================================
-- Migration 000134: Canonical tenant template — full email set +
-- default membership plans, seeded automatically for every new gym.
--
-- Until now, seed_tenant_defaults() (000120) only created a branch +
-- 4 basic email templates. The richer 9-template set (appointment
-- lifecycle, plan lifecycle) only existed on CaroGym, the original
-- tenant, and had to be copied + hand-patched to each new gym one at
-- a time (see 000128: copying to Impetú required manually
-- find-and-replacing a hardcoded brand color AND a literal "ARGYM"
-- string left in one template). That's exactly the failure mode this
-- migration removes: every new tenant now gets the full set
-- automatically, and the one hardcoded color (#6C63FF) is replaced
-- with a {{brand_color}} placeholder resolved per-tenant at send time
-- (see send-communication's templateVars) from that tenant's own
-- primary_color — so no gym's emails can ever carry another gym's
-- brand color or name.
--
-- Also adds the two default physical-access membership plans (Plan
-- Mensual / Plan Anual) that Impetú got as a one-off hardcoded insert
-- (000131) — now part of the standard template for every new gym.
--
-- Existing tenants (CaroGym, Impetú) are migrated in place: any
-- hardcoded brand hex already in their templates is swapped for
-- {{brand_color}} too, so the fix applies retroactively, not just to
-- gyms created from now on.
-- ============================================================

-- ── 1. Retroactively de-hardcode existing templates' brand color ───────────
UPDATE public.email_templates
SET body_html = REPLACE(REPLACE(body_html, '#6C63FF', '{{brand_color}}'), '#3B7AF7', '{{brand_color}}'),
    variables = CASE WHEN 'brand_color' = ANY(variables) THEN variables ELSE variables || ARRAY['brand_color'] END
WHERE body_html LIKE '%#6C63FF%' OR body_html LIKE '%#3B7AF7%';

-- ── 2. Canonical seed_tenant_defaults() ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_id UUID;
BEGIN
  -- ── Default branch ─────────────────────────────────────────────────────
  INSERT INTO public.branches (tenant_id, name, address)
  VALUES (p_tenant_id, 'Principal', '')
  ON CONFLICT DO NOTHING;

  -- ── Default membership plans (physical-access, editable afterward) ─────
  INSERT INTO public.plans
    (tenant_id, name, description, price, currency, billing_cycle, is_active, grants_physical_access, plan_tier, sort_order)
  VALUES
    (p_tenant_id, 'Plan Mensual', 'Membresía mensual con acceso físico al gimnasio', 20000, 'CRC', 'monthly', TRUE, TRUE, 'beginner', 1),
    (p_tenant_id, 'Plan Anual',   'Membresía anual con acceso físico al gimnasio',   200000, 'CRC', 'yearly',  TRUE, TRUE, 'beginner', 2)
  ON CONFLICT DO NOTHING;

  -- ── Email templates + communication rules ───────────────────────────────

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id, 'Bienvenida al cliente', '¡Bienvenido(a) a {{gym_name}}!',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 4px;font-size:15px;color:#374151">¡Bienvenido(a) a <strong>{{gym_name}}</strong>! Estamos muy contentos de que formes parte de nuestra comunidad.</p><div style="background:#f9fafb;border-radius:10px;padding:20px;margin:20px 0"><p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">¿Qué puedes hacer desde la app?</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:5px 8px 5px 0;font-size:16px;width:28px">&#128197;</td><td style="padding:5px 0;font-size:13px;color:#374151">Ver y confirmar tus <strong>citas</strong> con tu coach</td></tr><tr><td style="padding:5px 8px 5px 0;font-size:16px">&#128170;</td><td style="padding:5px 0;font-size:13px;color:#374151">Acceder a tus <strong>rutinas</strong> de entrenamiento</td></tr><tr><td style="padding:5px 8px 5px 0;font-size:16px">&#129367;</td><td style="padding:5px 0;font-size:13px;color:#374151">Revisar tu <strong>plan nutricional</strong></td></tr><tr><td style="padding:5px 8px 5px 0;font-size:16px">&#128200;</td><td style="padding:5px 0;font-size:13px;color:#374151">Registrar y visualizar tu <strong>progreso</strong></td></tr><tr><td style="padding:5px 8px 5px 0;font-size:16px">&#127919;</td><td style="padding:5px 0;font-size:13px;color:#374151">Ver tus <strong>planes y suscripciones</strong> disponibles</td></tr></table></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Comenzar ahora</a></div><p style="margin:0;font-size:13px;color:#6b7280">¡Mucho éxito en tu proceso!</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'gym_name', 'login_url', 'brand_color']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Bienvenida', 'client.welcome', v_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id, 'Cuenta aprobada', '{{gym_name}}: ¡Tu acceso ha sido aprobado!',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 20px;font-size:15px;color:#374151">¡Excelentes noticias! Tu solicitud de acceso a <strong>{{gym_name}}</strong> ha sido revisada y aprobada. Ya puedes ingresar a la plataforma.</p><div style="border:1px solid #bbf7d0;border-radius:10px;overflow:hidden;margin:0 0 24px"><div style="background:#16a34a;padding:14px 20px"><p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Acceso aprobado</p></div><div style="padding:16px 20px;background:#ffffff"><p style="margin:0;font-size:15px;color:#374151">Tu cuenta en <strong>{{gym_name}}</strong> está activa y lista para usar.</p><p style="margin:8px 0 0;font-size:13px;color:#6b7280">Puedes iniciar sesión con el correo con el que te registraste.</p></div></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Ingresar ahora</a></div><p style="margin:0;font-size:13px;color:#6b7280">Si tienes alguna pregunta, no dudes en contactar al equipo de {{gym_name}}.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'gym_name', 'login_url', 'brand_color']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Cuenta aprobada', 'client.approved', v_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id, 'Cita creada — pendiente de confirmación', '{{gym_name}}: Nueva cita programada — confirma tu asistencia',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 4px;font-size:15px;color:#374151">Se ha programado una nueva cita para ti. Por favor <strong>confírmala</strong> desde la aplicación para que quede activa.</p><div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin:20px 0"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#128197; Fecha</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_date}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#9200;&#65039; Hora</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_time}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#127947;&#65039; Coach</td><td style="padding:5px 0;font-weight:600;color:#111827">{{coach_name}}</td></tr></table></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Confirmar mi cita</a></div><p style="margin:0;font-size:13px;color:#6b7280">Si no puedes asistir, también puedes rechazarla desde la aplicación.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name', 'login_url', 'brand_color']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Cita creada', 'appointment.created', v_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id, 'Cita confirmada', '{{gym_name}}: ¡Tu cita está confirmada!',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 4px;font-size:15px;color:#374151">¡Tu cita ha sido confirmada! Te esperamos puntualmente.</p><div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin:20px 0"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#128197; Fecha</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_date}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#9200;&#65039; Hora</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_time}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#127947;&#65039; Coach</td><td style="padding:5px 0;font-weight:600;color:#111827">{{coach_name}}</td></tr></table></div><p style="margin:0;font-size:13px;color:#6b7280">Si necesitas cancelar o hacer algún cambio, contáctanos con anticipación.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name', 'brand_color']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Cita confirmada', 'appointment.confirmed', v_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id, 'Cita cancelada', '{{gym_name}}: Tu cita ha sido cancelada',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 4px;font-size:15px;color:#374151">Tu cita ha sido cancelada. Si deseas programar una nueva sesión, puedes hacerlo desde la aplicación.</p><div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin:20px 0"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#128197; Fecha</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_date}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#9200;&#65039; Hora</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_time}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#127947;&#65039; Coach</td><td style="padding:5px 0;font-weight:600;color:#111827">{{coach_name}}</td></tr></table></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Programar nueva cita</a></div><p style="margin:0;font-size:13px;color:#6b7280">Si crees que esto es un error, contáctanos directamente.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name', 'login_url', 'brand_color']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Cita cancelada', 'appointment.cancelled', v_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id, 'Recordatorio de cita', '{{gym_name}}: Recordatorio — tienes una cita próximamente',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 4px;font-size:15px;color:#374151">Este es un recordatorio de tu próxima cita. ¡Te esperamos!</p><div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin:20px 0"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#128197; Fecha</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_date}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#9200;&#65039; Hora</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_time}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#127947;&#65039; Coach</td><td style="padding:5px 0;font-weight:600;color:#111827">{{coach_name}}</td></tr></table></div><p style="margin:0;font-size:13px;color:#6b7280">Recuerda llegar con unos minutos de anticipación. Si necesitas cancelar, avísanos con tiempo.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name', 'brand_color']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Recordatorio de cita', 'appointment.reminder', v_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id, 'Plan adquirido', '{{gym_name}}: Comprobante de pago — {{plan_name}}',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 6px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 20px;font-size:15px;color:#374151">Tu pago ha sido procesado exitosamente. A continuación encontrarás el comprobante de tu suscripción en <strong>{{gym_name}}</strong>.</p><div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 24px"><div style="background:{{brand_color}};padding:14px 20px"><p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.8px">Comprobante de pago</p><p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#ffffff">{{invoice_number}}</p></div><div style="padding:18px 20px;background:#ffffff;border-bottom:1px solid #f3f4f6"><p style="margin:0;font-size:18px;font-weight:700;color:#111827">{{plan_name}}</p><p style="margin:5px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}} &middot; {{gym_name}}</p></div><div style="padding:16px 20px;background:#ffffff"><table style="width:100%;border-collapse:collapse;font-size:13px"><tr><td style="padding:6px 0;color:#6b7280">Monto pagado</td><td style="padding:6px 0;font-weight:700;color:#111827;text-align:right;font-size:15px">{{price}}</td></tr><tr><td style="padding:6px 0;color:#6b7280">Tipo de cobro</td><td style="padding:6px 0;font-weight:600;color:#111827;text-align:right">{{billing_cycle}}</td></tr><tr><td style="padding:6px 0;color:#6b7280">Fecha de pago</td><td style="padding:6px 0;font-weight:600;color:#111827;text-align:right">{{payment_date}}</td></tr><tr><td style="padding:6px 0;color:#6b7280">Vigente hasta</td><td style="padding:6px 0;font-weight:600;color:#111827;text-align:right">{{end_date}}</td></tr><tr><td colspan="2" style="padding:12px 0 0"><div style="height:1px;background:#f3f4f6"></div></td></tr><tr><td style="padding:10px 0 4px;color:#9ca3af;font-size:11px">Número de factura</td><td style="padding:10px 0 4px;color:#9ca3af;font-size:11px;text-align:right">{{invoice_number}}</td></tr><tr><td style="padding:0 0 6px;color:#9ca3af;font-size:11px">Referencia de pago</td><td style="padding:0 0 6px;color:#9ca3af;font-size:11px;text-align:right;word-break:break-all">{{payment_reference}}</td></tr></table></div><div style="padding:12px 20px;background:#f0fdf4;border-top:1px solid #bbf7d0;text-align:center"><span style="font-size:13px;font-weight:700;color:#15803d">&#10003; &nbsp;Pago confirmado</span></div></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Acceder a mi cuenta</a></div><p style="margin:0;font-size:13px;color:#6b7280">Guarda este mensaje como comprobante de tu pago. ¡Gracias por confiar en <strong>{{gym_name}}</strong>!</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'plan_name', 'billing_cycle', 'price', 'payment_date', 'end_date', 'invoice_number', 'payment_reference', 'gym_name', 'login_url', 'brand_color']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Confirmación de pago', 'plan.purchased', v_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id, 'Plan por vencer', '{{gym_name}}: Tu plan {{plan_name}} vence en 7 días',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 20px;font-size:15px;color:#374151">Tu plan en <strong>{{gym_name}}</strong> está próximo a vencer. Renuévalo para no interrumpir tu progreso.</p><div style="border:1px solid #fde68a;border-radius:10px;overflow:hidden;margin:0 0 24px"><div style="background:#f59e0b;padding:14px 20px"><p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Aviso de vencimiento</p></div><div style="padding:16px 20px;background:#ffffff"><p style="margin:0;font-size:17px;font-weight:700;color:#111827">{{plan_name}}</p><p style="margin:4px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}}</p></div><div style="padding:12px 20px;background:#fffbeb;border-top:1px solid #fde68a"><p style="margin:0;font-size:13px;color:#92400e">&#9888;&#65039; &nbsp;Vence el <strong>{{end_date}}</strong></p></div></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Renovar mi plan</a></div><p style="margin:0;font-size:13px;color:#6b7280">Si ya realizaste el pago, ignora este mensaje.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'plan_name', 'billing_cycle', 'end_date', 'gym_name', 'login_url', 'brand_color']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Plan por vencer', 'plan.expiring', v_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  VALUES (
    p_tenant_id, 'Plan vencido', '{{gym_name}}: Tu plan {{plan_name}} ha vencido',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 20px;font-size:15px;color:#374151">Tu plan en <strong>{{gym_name}}</strong> ha vencido. Renuévalo para seguir entrenando sin interrupciones.</p><div style="border:1px solid #fecaca;border-radius:10px;overflow:hidden;margin:0 0 24px"><div style="background:#dc2626;padding:14px 20px"><p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Plan vencido</p></div><div style="padding:16px 20px;background:#ffffff"><p style="margin:0;font-size:17px;font-weight:700;color:#111827">{{plan_name}}</p><p style="margin:4px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}}</p></div><div style="padding:12px 20px;background:#fef2f2;border-top:1px solid #fecaca"><p style="margin:0;font-size:13px;color:#991b1b">&#10060; &nbsp;Venció el <strong>{{end_date}}</strong> &mdash; acceso suspendido</p></div></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Renovar ahora</a></div><p style="margin:0;font-size:13px;color:#6b7280">¡Esperamos verte de regreso pronto!</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'plan_name', 'billing_cycle', 'end_date', 'gym_name', 'login_url', 'brand_color']
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
    VALUES (p_tenant_id, 'Plan vencido', 'plan.expired', v_id, 'client', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

END;
$fn$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_defaults(UUID) TO service_role;
