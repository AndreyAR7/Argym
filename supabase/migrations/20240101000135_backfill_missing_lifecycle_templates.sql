-- ============================================================
-- Migration 000135: Backfill the 5 lifecycle templates missing on
-- tenants created before 000134 (e.g. KV FITNESS) — appointment
-- created/confirmed/cancelled, plan expiring/expired.
--
-- 000134 only fixed the hardcoded brand color on templates that
-- already existed; it never backfilled tenants whose seed predates
-- the 9-template canon and only ever got the old 4 basic ones.
--
-- Per-tenant, per-event_type: only inserts a template + rule when
-- that tenant has NO existing communication_rule for that event_type
-- yet, so tenants that already have (possibly hand-edited) welcome/
-- approved/purchased/reminder templates are left untouched — this
-- only fills genuine gaps, never duplicates or overwrites.
-- ============================================================

WITH canon(name, subject, body_html, variables, event_type, rule_name) AS (
  VALUES
  (
    'Cita creada — pendiente de confirmación',
    '{{gym_name}}: Nueva cita programada — confirma tu asistencia',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 4px;font-size:15px;color:#374151">Se ha programado una nueva cita para ti. Por favor <strong>confírmala</strong> desde la aplicación para que quede activa.</p><div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin:20px 0"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#128197; Fecha</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_date}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#9200;&#65039; Hora</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_time}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#127947;&#65039; Coach</td><td style="padding:5px 0;font-weight:600;color:#111827">{{coach_name}}</td></tr></table></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Confirmar mi cita</a></div><p style="margin:0;font-size:13px;color:#6b7280">Si no puedes asistir, también puedes rechazarla desde la aplicación.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name', 'login_url', 'brand_color']::text[],
    'appointment.created',
    'Cita creada'
  ),
  (
    'Cita confirmada',
    '{{gym_name}}: ¡Tu cita está confirmada!',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 4px;font-size:15px;color:#374151">¡Tu cita ha sido confirmada! Te esperamos puntualmente.</p><div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin:20px 0"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#128197; Fecha</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_date}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#9200;&#65039; Hora</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_time}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#127947;&#65039; Coach</td><td style="padding:5px 0;font-weight:600;color:#111827">{{coach_name}}</td></tr></table></div><p style="margin:0;font-size:13px;color:#6b7280">Si necesitas cancelar o hacer algún cambio, contáctanos con anticipación.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name', 'brand_color']::text[],
    'appointment.confirmed',
    'Cita confirmada'
  ),
  (
    'Cita cancelada',
    '{{gym_name}}: Tu cita ha sido cancelada',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 4px;font-size:15px;color:#374151">Tu cita ha sido cancelada. Si deseas programar una nueva sesión, puedes hacerlo desde la aplicación.</p><div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin:20px 0"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#128197; Fecha</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_date}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#9200;&#65039; Hora</td><td style="padding:5px 0;font-weight:600;color:#111827">{{appointment_time}}</td></tr><tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#127947;&#65039; Coach</td><td style="padding:5px 0;font-weight:600;color:#111827">{{coach_name}}</td></tr></table></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Programar nueva cita</a></div><p style="margin:0;font-size:13px;color:#6b7280">Si crees que esto es un error, contáctanos directamente.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name', 'login_url', 'brand_color']::text[],
    'appointment.cancelled',
    'Cita cancelada'
  ),
  (
    'Plan por vencer',
    '{{gym_name}}: Tu plan {{plan_name}} vence en 7 días',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 20px;font-size:15px;color:#374151">Tu plan en <strong>{{gym_name}}</strong> está próximo a vencer. Renuévalo para no interrumpir tu progreso.</p><div style="border:1px solid #fde68a;border-radius:10px;overflow:hidden;margin:0 0 24px"><div style="background:#f59e0b;padding:14px 20px"><p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Aviso de vencimiento</p></div><div style="padding:16px 20px;background:#ffffff"><p style="margin:0;font-size:17px;font-weight:700;color:#111827">{{plan_name}}</p><p style="margin:4px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}}</p></div><div style="padding:12px 20px;background:#fffbeb;border-top:1px solid #fde68a"><p style="margin:0;font-size:13px;color:#92400e">&#9888;&#65039; &nbsp;Vence el <strong>{{end_date}}</strong></p></div></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Renovar mi plan</a></div><p style="margin:0;font-size:13px;color:#6b7280">Si ya realizaste el pago, ignora este mensaje.</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'plan_name', 'billing_cycle', 'end_date', 'gym_name', 'login_url', 'brand_color']::text[],
    'plan.expiring',
    'Plan por vencer'
  ),
  (
    'Plan vencido',
    '{{gym_name}}: Tu plan {{plan_name}} ha vencido',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:{{brand_color}};padding:24px 32px"><h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1></div><div style="padding:32px"><p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p><p style="margin:0 0 20px;font-size:15px;color:#374151">Tu plan en <strong>{{gym_name}}</strong> ha vencido. Renuévalo para seguir entrenando sin interrupciones.</p><div style="border:1px solid #fecaca;border-radius:10px;overflow:hidden;margin:0 0 24px"><div style="background:#dc2626;padding:14px 20px"><p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Plan vencido</p></div><div style="padding:16px 20px;background:#ffffff"><p style="margin:0;font-size:17px;font-weight:700;color:#111827">{{plan_name}}</p><p style="margin:4px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}}</p></div><div style="padding:12px 20px;background:#fef2f2;border-top:1px solid #fecaca"><p style="margin:0;font-size:13px;color:#991b1b">&#10060; &nbsp;Venció el <strong>{{end_date}}</strong> &mdash; acceso suspendido</p></div></div><div style="text-align:center;margin:0 0 24px"><a href="{{login_url}}" style="display:inline-block;background:{{brand_color}};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Renovar ahora</a></div><p style="margin:0;font-size:13px;color:#6b7280">¡Esperamos verte de regreso pronto!</p></div><div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p></div></div>$html$,
    ARRAY['client_name', 'plan_name', 'billing_cycle', 'end_date', 'gym_name', 'login_url', 'brand_color']::text[],
    'plan.expired',
    'Plan vencido'
  )
),
missing AS (
  SELECT t.id AS tenant_id, c.name, c.subject, c.body_html, c.variables, c.event_type, c.rule_name
  FROM public.tenants t
  CROSS JOIN canon c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.communication_rules cr
    WHERE cr.tenant_id = t.id AND cr.event_type = c.event_type
  )
),
inserted_templates AS (
  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  SELECT tenant_id, name, subject, body_html, variables FROM missing
  RETURNING id, tenant_id, name
)
INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, is_active)
SELECT it.tenant_id, m.rule_name, m.event_type, it.id, 'client', TRUE
FROM inserted_templates it
JOIN missing m ON m.tenant_id = it.tenant_id AND m.name = it.name;
