'use server'

import { getSessionData } from '@/lib/auth/session'

// ── Shared HTML helpers ────────────────────────────────────────

function emailWrap(body: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#6C63FF;padding:24px 32px">
    <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1>
  </div>
  <div style="padding:32px">
${body}
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email automático &middot; No responder a este mensaje</p>
  </div>
</div>`
}

function infoCard(rows: [string, string][]) {
  return `<div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows.map(([label, val]) => `<tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">${label}</td><td style="padding:5px 0;font-weight:600;color:#111827">${val}</td></tr>`).join('\n        ')}
      </table>
    </div>`
}

function ctaButton(label: string, href = '{{login_url}}') {
  return `<a href="${href}" style="display:inline-block;background:#6C63FF;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">${label}</a>`
}

// ── Default template definitions ────────────────────────────────

const DEFAULT_TEMPLATES: { name: string; subject: string; variables: string[]; body_html: string }[] = [
  {
    name:      'Cita creada — pendiente de confirmación',
    subject:   '{{gym_name}}: Nueva cita programada — confirma tu asistencia',
    variables: ['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name', 'login_url'],
    body_html: emailWrap(`    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 4px;font-size:15px;color:#374151">Se ha programado una nueva cita para ti. Por favor <strong>confírmala</strong> desde la aplicación para que quede activa.</p>
    ${infoCard([['📅 Fecha', '{{appointment_date}}'], ['⏰ Hora', '{{appointment_time}}'], ['🏋️ Coach', '{{coach_name}}']])}
    ${ctaButton('Confirmar mi cita')}
    <p style="margin:20px 0 0;font-size:13px;color:#6b7280">Si no puedes asistir, también puedes rechazarla desde la aplicación. La cita se cancela automáticamente si no se confirma 15 minutos después de la hora programada.</p>`),
  },
  {
    name:      'Cita confirmada',
    subject:   '{{gym_name}}: ¡Tu cita está confirmada!',
    variables: ['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name'],
    body_html: emailWrap(`    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 4px;font-size:15px;color:#374151">¡Tu cita ha sido confirmada! Te esperamos puntualmente.</p>
    ${infoCard([['📅 Fecha', '{{appointment_date}}'], ['⏰ Hora', '{{appointment_time}}'], ['🏋️ Coach', '{{coach_name}}']])}
    <p style="margin:0;font-size:13px;color:#6b7280">Si necesitas cancelar o hacer algún cambio, contáctanos con anticipación.</p>`),
  },
  {
    name:      'Cita cancelada',
    subject:   '{{gym_name}}: Tu cita ha sido cancelada',
    variables: ['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name', 'login_url'],
    body_html: emailWrap(`    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 4px;font-size:15px;color:#374151">Tu cita ha sido cancelada. Si deseas programar una nueva sesión, puedes hacerlo desde la aplicación.</p>
    ${infoCard([['📅 Fecha', '{{appointment_date}}'], ['⏰ Hora', '{{appointment_time}}'], ['🏋️ Coach', '{{coach_name}}']])}
    ${ctaButton('Programar nueva cita')}
    <p style="margin:20px 0 0;font-size:13px;color:#6b7280">Si crees que esto es un error, contáctanos directamente.</p>`),
  },
  {
    name:      'Recordatorio de cita',
    subject:   '{{gym_name}}: Recordatorio — tienes una cita próximamente',
    variables: ['client_name', 'coach_name', 'appointment_date', 'appointment_time', 'gym_name'],
    body_html: emailWrap(`    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 4px;font-size:15px;color:#374151">Este es un recordatorio de tu próxima cita. ¡Te esperamos!</p>
    ${infoCard([['📅 Fecha', '{{appointment_date}}'], ['⏰ Hora', '{{appointment_time}}'], ['🏋️ Coach', '{{coach_name}}']])}
    <p style="margin:0;font-size:13px;color:#6b7280">Recuerda llegar con unos minutos de anticipación. Si necesitas cancelar, avísanos con tiempo.</p>`),
  },
  {
    name:      'Plan adquirido',
    subject:   '{{gym_name}}: Comprobante de pago — {{plan_name}}',
    variables: ['client_name', 'plan_name', 'billing_cycle', 'price', 'payment_date', 'end_date', 'invoice_number', 'payment_reference', 'gym_name', 'login_url'],
    body_html: emailWrap(`    <p style="margin:0 0 6px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151">Tu pago ha sido procesado exitosamente. A continuación encontrarás el comprobante de tu suscripción en <strong>{{gym_name}}</strong>.</p>

    <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 24px">

      <div style="background:#6C63FF;padding:14px 20px">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.8px">Comprobante de pago</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#ffffff">{{invoice_number}}</p>
      </div>

      <div style="padding:18px 20px;background:#ffffff;border-bottom:1px solid #f3f4f6">
        <p style="margin:0;font-size:18px;font-weight:700;color:#111827">{{plan_name}}</p>
        <p style="margin:5px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}} &middot; {{gym_name}}</p>
      </div>

      <div style="padding:16px 20px;background:#ffffff">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="padding:6px 0;color:#6b7280">Monto pagado</td>
            <td style="padding:6px 0;font-weight:700;color:#111827;text-align:right;font-size:15px">{{price}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">Tipo de cobro</td>
            <td style="padding:6px 0;font-weight:600;color:#111827;text-align:right">{{billing_cycle}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">Fecha de pago</td>
            <td style="padding:6px 0;font-weight:600;color:#111827;text-align:right">{{payment_date}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">Vigente hasta</td>
            <td style="padding:6px 0;font-weight:600;color:#111827;text-align:right">{{end_date}}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:12px 0 0"><div style="height:1px;background:#f3f4f6"></div></td>
          </tr>
          <tr>
            <td style="padding:10px 0 4px;color:#9ca3af;font-size:11px">Número de factura</td>
            <td style="padding:10px 0 4px;color:#9ca3af;font-size:11px;text-align:right">{{invoice_number}}</td>
          </tr>
          <tr>
            <td style="padding:0 0 6px;color:#9ca3af;font-size:11px">Referencia de pago</td>
            <td style="padding:0 0 6px;color:#9ca3af;font-size:11px;text-align:right;word-break:break-all">{{payment_reference}}</td>
          </tr>
        </table>
      </div>

      <div style="padding:12px 20px;background:#f0fdf4;border-top:1px solid #bbf7d0;text-align:center">
        <span style="font-size:13px;font-weight:700;color:#15803d">✓ &nbsp;Pago confirmado</span>
      </div>

    </div>

    <div style="text-align:center;margin:0 0 24px">
      ${ctaButton('Acceder a mi cuenta')}
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280">Si tienes alguna pregunta sobre esta suscripción, responde a este correo o contáctanos directamente. Guarda este mensaje como comprobante de tu pago.</p>
    <p style="margin:12px 0 0;font-size:13px;color:#6b7280">¡Gracias por confiar en <strong>{{gym_name}}</strong>!</p>`),
  },
  {
    name:      'Plan por vencer',
    subject:   '{{gym_name}}: Tu plan {{plan_name}} vence en 7 días',
    variables: ['client_name', 'plan_name', 'billing_cycle', 'end_date', 'gym_name', 'login_url'],
    body_html: emailWrap(`    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151">Tu plan en <strong>{{gym_name}}</strong> está próximo a vencer. Renuévalo para no interrumpir tu progreso.</p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <div style="background:#f59e0b;padding:14px 20px">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Aviso de vencimiento</p>
      </div>
      <div style="padding:16px 20px;background:#ffffff">
        <p style="margin:0;font-size:17px;font-weight:700;color:#111827">{{plan_name}}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}}</p>
      </div>
      <div style="padding:12px 20px;background:#fffbeb;border-top:1px solid #fde68a">
        <p style="margin:0;font-size:13px;color:#92400e">⚠️ &nbsp;Vence el <strong>{{end_date}}</strong></p>
      </div>
    </div>
    ${ctaButton('Renovar mi plan')}
    <p style="margin:20px 0 0;font-size:13px;color:#6b7280">Si ya realizaste el pago, ignora este mensaje. Gracias por ser parte de {{gym_name}}.</p>`),
  },
  {
    name:      'Plan vencido',
    subject:   '{{gym_name}}: Tu plan {{plan_name}} ha vencido',
    variables: ['client_name', 'plan_name', 'billing_cycle', 'end_date', 'gym_name', 'login_url'],
    body_html: emailWrap(`    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151">Tu plan en <strong>{{gym_name}}</strong> ha vencido. Renuévalo para seguir entrenando sin interrupciones.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <div style="background:#dc2626;padding:14px 20px">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Plan vencido</p>
      </div>
      <div style="padding:16px 20px;background:#ffffff">
        <p style="margin:0;font-size:17px;font-weight:700;color:#111827">{{plan_name}}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}}</p>
      </div>
      <div style="padding:12px 20px;background:#fef2f2;border-top:1px solid #fecaca">
        <p style="margin:0;font-size:13px;color:#991b1b">❌ &nbsp;Venció el <strong>{{end_date}}</strong> — acceso suspendido</p>
      </div>
    </div>
    ${ctaButton('Renovar ahora')}
    <p style="margin:20px 0 0;font-size:13px;color:#6b7280">¡Esperamos verte de regreso pronto! El equipo de {{gym_name}} está aquí para ayudarte.</p>`),
  },
  {
    name:      'Promoción aplicada',
    subject:   '{{gym_name}}: Promoción aplicada exitosamente',
    variables: ['client_name', 'gym_name', 'login_url'],
    body_html: emailWrap(`    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 4px;font-size:15px;color:#374151">¡Tu promoción ha sido aplicada exitosamente! Disfruta de los beneficios especiales en <strong>{{gym_name}}</strong>.</p>
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:18px 20px;margin:20px 0">
      <p style="margin:0;font-size:15px;font-weight:700;color:#6d28d9">🎉 Promoción activa</p>
      <p style="margin:6px 0 0;font-size:13px;color:#5b21b6">Los beneficios ya están disponibles en tu cuenta</p>
    </div>
    ${ctaButton('Ver mi cuenta')}
    <p style="margin:20px 0 0;font-size:13px;color:#6b7280">Gracias por elegir {{gym_name}}.</p>`),
  },
  {
    name:      'Cuenta aprobada',
    subject:   '{{gym_name}}: ¡Tu acceso ha sido aprobado!',
    variables: ['client_name', 'gym_name', 'login_url'],
    body_html: emailWrap(`    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151">¡Excelentes noticias! Tu solicitud de acceso a <strong>{{gym_name}}</strong> ha sido revisada y aprobada. Ya puedes ingresar a la plataforma.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;overflow:hidden;margin:0 0 24px">
      <div style="background:#16a34a;padding:14px 20px">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px">Acceso aprobado</p>
      </div>
      <div style="padding:16px 20px;background:#ffffff">
        <p style="margin:0;font-size:15px;color:#374151">Tu cuenta en <strong>{{gym_name}}</strong> está activa y lista para usar.</p>
        <p style="margin:8px 0 0;font-size:13px;color:#6b7280">Puedes iniciar sesión con el correo con el que te registraste.</p>
      </div>
    </div>
    ${ctaButton('Ingresar ahora')}
    <p style="margin:20px 0 0;font-size:13px;color:#6b7280">Si tienes alguna pregunta, no dudes en contactar al equipo de {{gym_name}}. ¡Estamos aquí para ayudarte!</p>`),
  },
  {
    name:      'Bienvenida al cliente',
    subject:   '¡Bienvenido(a) a {{gym_name}}! 🎉',
    variables: ['client_name', 'gym_name', 'login_url'],
    body_html: emailWrap(`    <p style="margin:0 0 8px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 4px;font-size:15px;color:#374151">¡Bienvenido(a) a <strong>{{gym_name}}</strong>! Estamos muy contentos de que formes parte de nuestra comunidad. Aquí empieza tu transformación.</p>
    <div style="background:#f9fafb;border-radius:10px;padding:20px;margin:20px 0">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">¿Qué puedes hacer desde la app?</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:5px 0;font-size:13px;color:#374151">📅</td><td style="padding:5px 0;font-size:13px;color:#374151">Ver y confirmar tus <strong>citas</strong> con tu coach</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#374151">💪</td><td style="padding:5px 0;font-size:13px;color:#374151">Acceder a tus <strong>rutinas</strong> de entrenamiento</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#374151">🥗</td><td style="padding:5px 0;font-size:13px;color:#374151">Revisar tu <strong>plan nutricional</strong></td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#374151">📈</td><td style="padding:5px 0;font-size:13px;color:#374151">Registrar y visualizar tu <strong>progreso</strong></td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#374151">🎯</td><td style="padding:5px 0;font-size:13px;color:#374151">Ver tus <strong>planes y suscripciones</strong> disponibles</td></tr>
      </table>
    </div>
    ${ctaButton('Comenzar ahora')}
    <p style="margin:20px 0 0;font-size:13px;color:#6b7280">¡Mucho éxito en tu proceso! El equipo de <strong>{{gym_name}}</strong> estará acompañándote en cada paso del camino.</p>`),
  },
]

export async function seedDefaultTemplatesAction(): Promise<{ inserted: number; error?: string }> {
  const session = await getSessionData()
  if (!session) return { inserted: 0, error: 'No autenticado' }
  const { supabase, tenantId } = session

  const rows = DEFAULT_TEMPLATES.map(t => ({ ...t, tenant_id: tenantId }))
  const { data, error } = await supabase
    .from('email_templates')
    .upsert(rows, { onConflict: 'tenant_id,name', ignoreDuplicates: false })
    .select('id')
  if (error) return { inserted: 0, error: error.message }
  return { inserted: (data ?? []).length }
}

// Default rules: one per event_type, linked to the corresponding template
const DEFAULT_RULES: { name: string; event_type: string; template_name: string; recipients: string }[] = [
  { name: 'Notificación de cita creada',     event_type: 'appointment.created',   template_name: 'Cita creada — pendiente de confirmación', recipients: 'client_and_coach' },
  { name: 'Notificación de cita confirmada', event_type: 'appointment.confirmed', template_name: 'Cita confirmada',                          recipients: 'client_and_coach' },
  { name: 'Notificación de cita cancelada',  event_type: 'appointment.cancelled', template_name: 'Cita cancelada',                           recipients: 'client_and_coach' },
  { name: 'Recordatorio de cita 30 min',     event_type: 'appointment.reminder',  template_name: 'Recordatorio de cita',                     recipients: 'client' },
  { name: 'Comprobante de plan adquirido',   event_type: 'plan.purchased',        template_name: 'Plan adquirido',                           recipients: 'client' },
  { name: 'Aviso de plan por vencer',        event_type: 'plan.expiring',         template_name: 'Plan por vencer',                          recipients: 'client' },
  { name: 'Notificación de plan vencido',    event_type: 'plan.expired',          template_name: 'Plan vencido',                             recipients: 'client' },
  { name: 'Cuenta aprobada',                 event_type: 'client.approved',       template_name: 'Cuenta aprobada',                          recipients: 'client' },
  { name: 'Email de bienvenida',             event_type: 'client.welcome',        template_name: 'Bienvenida al cliente',                    recipients: 'client' },
]

export async function seedDefaultRulesAction(): Promise<{ created: number; skipped: number; error?: string }> {
  const session = await getSessionData()
  if (!session) return { created: 0, skipped: 0, error: 'No autenticado' }
  const { supabase, tenantId } = session

  // Fetch all templates for this tenant
  const { data: templates, error: tmplErr } = await supabase
    .from('email_templates')
    .select('id, name')
    .eq('tenant_id', tenantId)
  if (tmplErr) return { created: 0, skipped: 0, error: tmplErr.message }

  const tmplMap = new Map((templates ?? []).map((t: { id: string; name: string }) => [t.name, t.id]))

  // Fetch existing rules to avoid duplicates per event_type
  const { data: existingRules } = await supabase
    .from('communication_rules')
    .select('event_type')
    .eq('tenant_id', tenantId)
  const existingEvents = new Set((existingRules ?? []).map((r: { event_type: string }) => r.event_type))

  const toInsert = DEFAULT_RULES
    .filter(r => !existingEvents.has(r.event_type) && tmplMap.has(r.template_name))
    .map(r => ({
      tenant_id:   tenantId,
      name:        r.name,
      event_type:  r.event_type,
      template_id: tmplMap.get(r.template_name)!,
      recipients:  r.recipients,
      is_active:   true,
    }))

  const skipped = DEFAULT_RULES.length - toInsert.length

  if (!toInsert.length) return { created: 0, skipped }

  const { data, error } = await supabase.from('communication_rules').insert(toInsert).select('id')
  if (error) return { created: 0, skipped, error: error.message }
  return { created: (data ?? []).length, skipped }
}

export async function updateTemplateAction(
  id: string,
  payload: { name: string; subject: string; body_html: string; variables: string[] },
): Promise<{ error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase } = session
  const { error } = await supabase.from('email_templates').update(payload).eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function deleteTemplateAction(id: string): Promise<{ error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase } = session
  const { error } = await supabase.from('email_templates').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function saveSmtpAction(payload: {
  host: string
  port: number
  username: string
  password: string | null
  from_email: string
  from_name: string
  use_tls: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSessionData()
  if (!session) return { ok: false, error: 'No autenticado' }
  const { supabase, tenantId } = session

  // Check if a config already exists for this tenant
  const { data: existing } = await supabase
    .from('smtp_configs')
    .select('id, password')
    .maybeSingle()

  const password = payload.password || existing?.password || ''
  const row = { ...payload, password, tenant_id: tenantId, is_active: true }

  let error
  if (existing?.id) {
    ;({ error } = await supabase.from('smtp_configs').update(row).eq('id', existing.id))
  } else {
    ;({ error } = await supabase.from('smtp_configs').insert(row))
  }

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ── Email Logs ────────────────────────────────────────────────────

export interface EmailLog {
  id: string
  to_email: string
  subject: string
  status: 'pending' | 'sent' | 'failed' | 'bounced'
  error_msg: string | null
  body_html: string | null
  retry_count: number
  created_at: string
  sent_at: string | null
  rule_id: string | null
  template_id: string | null
}

export async function getEmailLogsAction(limit = 100): Promise<{ logs?: EmailLog[]; error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase } = session

  const { data, error } = await supabase
    .from('email_logs')
    .select('id, to_email, subject, status, error_msg, body_html, retry_count, created_at, sent_at, rule_id, template_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { error: error.message }
  return { logs: (data ?? []) as EmailLog[] }
}

// SMTP verify/send/resend all run inside the "test-smtp" Supabase Edge
// Function, not here — this Next.js app is hosted on Render, whose free
// web-service tier blocks outbound SMTP ports (25/465/587). The edge
// function runs on Supabase's own infrastructure instead (the same place
// the real automated communication_rules emails already send from
// successfully), so it isn't subject to that block.

export async function retryEmailAction(logId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSessionData()
  if (!session) return { ok: false, error: 'No autenticado' }
  const { supabase, tenantId } = session

  const { data, error } = await supabase.functions.invoke('test-smtp', {
    body: { tenant_id: tenantId, mode: 'resend', log_id: logId },
  })
  if (error) return { ok: false, error: error.message }
  if (!data?.ok) return { ok: false, error: data?.message ?? 'Error desconocido' }
  return { ok: true }
}

export async function bulkRetryFailedAction(): Promise<{ ok: boolean; sent: number; failed: number; error?: string }> {
  const session = await getSessionData()
  if (!session) return { ok: false, sent: 0, failed: 0, error: 'No autenticado' }
  const { supabase, tenantId } = session

  const { data, error } = await supabase.functions.invoke('test-smtp', {
    body: { tenant_id: tenantId, mode: 'bulk_resend' },
  })
  if (error) return { ok: false, sent: 0, failed: 0, error: error.message }
  if (!data?.ok) return { ok: false, sent: 0, failed: 0, error: data?.message ?? 'Error desconocido' }
  return { ok: true, sent: data.sent ?? 0, failed: data.failed ?? 0 }
}

export async function testSmtpAction(toEmail: string): Promise<{ ok: boolean; message: string }> {
  const session = await getSessionData()
  if (!session) return { ok: false, message: 'No autenticado' }
  const { supabase, tenantId } = session

  const { data, error } = await supabase.functions.invoke('test-smtp', {
    body: { tenant_id: tenantId, mode: 'test', to_email: toEmail },
  })
  if (error) return { ok: false, message: error.message }
  return { ok: !!data?.ok, message: data?.message ?? (data?.ok ? 'Enviado' : 'Error desconocido') }
}
