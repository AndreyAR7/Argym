-- Update email templates for plan expiry events and client account events
-- to match the improved versions in actions.ts

-- ── Plan por vencer ───────────────────────────────────────────────
UPDATE public.email_templates SET
  subject   = '{{gym_name}}: Tu plan {{plan_name}} vence en 7 días',
  variables = ARRAY['client_name','plan_name','billing_cycle','end_date','gym_name','login_url'],
  body_html = '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#6C63FF;padding:24px 32px">
    <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151">Tu plan en <strong>{{gym_name}}</strong> est&aacute; pr&oacute;ximo a vencer. Ren&uacute;evalo para no interrumpir tu progreso.</p>
    <div style="border:1px solid #fde68a;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <div style="background:#f59e0b;padding:14px 20px">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Aviso de vencimiento</p>
      </div>
      <div style="padding:16px 20px;background:#ffffff">
        <p style="margin:0;font-size:17px;font-weight:700;color:#111827">{{plan_name}}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}}</p>
      </div>
      <div style="padding:12px 20px;background:#fffbeb;border-top:1px solid #fde68a">
        <p style="margin:0;font-size:13px;color:#92400e">&#9888;&#65039; &nbsp;Vence el <strong>{{end_date}}</strong></p>
      </div>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <a href="{{login_url}}" style="display:inline-block;background:#6C63FF;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Renovar mi plan</a>
    </div>
    <p style="margin:0;font-size:13px;color:#6b7280">Si ya realizaste el pago, ignora este mensaje. Gracias por ser parte de {{gym_name}}.</p>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email autom&aacute;tico &middot; No responder a este mensaje</p>
  </div>
</div>',
  updated_at = NOW()
WHERE name = 'Plan por vencer';

-- ── Plan vencido ──────────────────────────────────────────────────
UPDATE public.email_templates SET
  subject   = '{{gym_name}}: Tu plan {{plan_name}} ha vencido',
  variables = ARRAY['client_name','plan_name','billing_cycle','end_date','gym_name','login_url'],
  body_html = '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#6C63FF;padding:24px 32px">
    <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151">Tu plan en <strong>{{gym_name}}</strong> ha vencido. Ren&uacute;evalo para seguir entrenando sin interrupciones.</p>
    <div style="border:1px solid #fecaca;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <div style="background:#dc2626;padding:14px 20px">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Plan vencido</p>
      </div>
      <div style="padding:16px 20px;background:#ffffff">
        <p style="margin:0;font-size:17px;font-weight:700;color:#111827">{{plan_name}}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}}</p>
      </div>
      <div style="padding:12px 20px;background:#fef2f2;border-top:1px solid #fecaca">
        <p style="margin:0;font-size:13px;color:#991b1b">&#10060; &nbsp;Venci&oacute; el <strong>{{end_date}}</strong> &mdash; acceso suspendido</p>
      </div>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <a href="{{login_url}}" style="display:inline-block;background:#6C63FF;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Renovar ahora</a>
    </div>
    <p style="margin:0;font-size:13px;color:#6b7280">&iexcl;Esperamos verte de regreso pronto! El equipo de {{gym_name}} est&aacute; aqu&iacute; para ayudarte.</p>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email autom&aacute;tico &middot; No responder a este mensaje</p>
  </div>
</div>',
  updated_at = NOW()
WHERE name = 'Plan vencido';

-- ── Cuenta aprobada ───────────────────────────────────────────────
UPDATE public.email_templates SET
  subject   = '{{gym_name}}: ¡Tu acceso ha sido aprobado!',
  body_html = '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#6C63FF;padding:24px 32px">
    <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151">&iexcl;Excelentes noticias! Tu solicitud de acceso a <strong>{{gym_name}}</strong> ha sido revisada y aprobada. Ya puedes ingresar a la plataforma.</p>
    <div style="border:1px solid #bbf7d0;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <div style="background:#16a34a;padding:14px 20px">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Acceso aprobado</p>
      </div>
      <div style="padding:16px 20px;background:#ffffff">
        <p style="margin:0;font-size:15px;color:#374151">Tu cuenta en <strong>{{gym_name}}</strong> est&aacute; activa y lista para usar.</p>
        <p style="margin:8px 0 0;font-size:13px;color:#6b7280">Puedes iniciar sesi&oacute;n con el correo con el que te registraste.</p>
      </div>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <a href="{{login_url}}" style="display:inline-block;background:#6C63FF;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Ingresar ahora</a>
    </div>
    <p style="margin:0;font-size:13px;color:#6b7280">Si tienes alguna pregunta, no dudes en contactar al equipo de {{gym_name}}. &iexcl;Estamos aqu&iacute; para ayudarte!</p>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email autom&aacute;tico &middot; No responder a este mensaje</p>
  </div>
</div>',
  updated_at = NOW()
WHERE name = 'Cuenta aprobada';

-- ── Bienvenida al cliente ─────────────────────────────────────────
UPDATE public.email_templates SET
  subject   = '¡Bienvenido(a) a {{gym_name}}!',
  body_html = '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#6C63FF;padding:24px 32px">
    <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 4px;font-size:15px;color:#374151">&iexcl;Bienvenido(a) a <strong>{{gym_name}}</strong>! Estamos muy contentos de que formes parte de nuestra comunidad. Aqu&iacute; empieza tu transformaci&oacute;n.</p>
    <div style="background:#f9fafb;border-radius:10px;padding:20px;margin:20px 0">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">&iquest;Qu&eacute; puedes hacer desde la app?</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:5px 8px 5px 0;font-size:16px;width:28px">&#128197;</td><td style="padding:5px 0;font-size:13px;color:#374151">Ver y confirmar tus <strong>citas</strong> con tu coach</td></tr>
        <tr><td style="padding:5px 8px 5px 0;font-size:16px">&#128170;</td><td style="padding:5px 0;font-size:13px;color:#374151">Acceder a tus <strong>rutinas</strong> de entrenamiento</td></tr>
        <tr><td style="padding:5px 8px 5px 0;font-size:16px">&#129367;</td><td style="padding:5px 0;font-size:13px;color:#374151">Revisar tu <strong>plan nutricional</strong></td></tr>
        <tr><td style="padding:5px 8px 5px 0;font-size:16px">&#128200;</td><td style="padding:5px 0;font-size:13px;color:#374151">Registrar y visualizar tu <strong>progreso</strong></td></tr>
        <tr><td style="padding:5px 8px 5px 0;font-size:16px">&#127919;</td><td style="padding:5px 0;font-size:13px;color:#374151">Ver tus <strong>planes y suscripciones</strong> disponibles</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <a href="{{login_url}}" style="display:inline-block;background:#6C63FF;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Comenzar ahora</a>
    </div>
    <p style="margin:0;font-size:13px;color:#6b7280">&iexcl;Mucho &eacute;xito en tu proceso! El equipo de <strong>{{gym_name}}</strong> estar&aacute; acompa&ntilde;&aacute;ndote en cada paso del camino.</p>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email autom&aacute;tico &middot; No responder a este mensaje</p>
  </div>
</div>',
  updated_at = NOW()
WHERE name = 'Bienvenida al cliente';
