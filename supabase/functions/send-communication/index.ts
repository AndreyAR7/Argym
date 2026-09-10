// IMPORTANT — verify_jwt must stay FALSE on this function in production.
// It's called from Postgres triggers/cron (trigger_appointment_communication
// etc., see supabase/migrations/20240101000111_*.sql) via net.http_post with
// only an x-webhook-secret header, no Authorization/JWT. supabase/config.toml
// declares verify_jwt = false for local dev, but that file is NOT read when
// redeploying via the Management API's /functions/deploy endpoint (no
// Supabase CLI in this project's workflow) — omitting verify_jwt from that
// call resets it to the platform default (true), which makes the gateway
// reject every trigger-originated call with 401 UNAUTHORIZED_NO_AUTH_HEADER
// *silently* (the trigger's EXCEPTION WHEN OTHERS swallows it) — this broke
// every appointment/plan/approval email for a while before being caught.
// Any redeploy must explicitly PATCH verify_jwt back to false afterward:
//   PATCH /v1/projects/{ref}/functions/send-communication  body: {"verify_jwt": false}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTransport } from 'npm:nodemailer'
import PDFDocument from 'npm:pdfkit'

interface Payload {
  event_type:       string
  tenant_id:        string
  appointment_id?:  string
  subscription_id?: string
  user_id?:         string
  invitation_id?:   string
}

interface ReceiptData {
  invoiceNumber:    string
  gymName:          string
  clientName:       string
  planName:         string
  billingCycle:     string
  price:            string
  currency:         string
  amount:           number
  paymentDate:      string
  endDate:          string
  paymentReference: string
}

type Attachment = {
  filename:    string
  content:     Uint8Array | string
  contentType: string
}

// ── XML receipt (simple structured document, not Costa Rica FE) ─────────────
function generateReceiptXML(d: ReceiptData): string {
  const e = (s: string | number) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ComprobantePago>
  <Emisor>
    <Nombre>${e(d.gymName)}</Nombre>
  </Emisor>
  <Receptor>
    <Nombre>${e(d.clientName)}</Nombre>
  </Receptor>
  <NumeroComprobante>${e(d.invoiceNumber)}</NumeroComprobante>
  <FechaPago>${e(d.paymentDate)}</FechaPago>
  <Plan>${e(d.planName)}</Plan>
  <CicloPago>${e(d.billingCycle)}</CicloPago>
  <Monto>${d.amount}</Monto>
  <Moneda>${e(d.currency)}</Moneda>
  <MontoFormateado>${e(d.price)}</MontoFormateado>
  <ReferenciaPago>${e(d.paymentReference)}</ReferenciaPago>
  <Vencimiento>${e(d.endDate)}</Vencimiento>
</ComprobantePago>`
}

// ── PDF receipt ──────────────────────────────────────────────────────────────
async function generateReceiptPDF(d: ReceiptData): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: { Title: `Comprobante ${d.invoiceNumber}`, Author: d.gymName },
    })

    const chunks: Uint8Array[] = []
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    doc.on('end', () => {
      const total = chunks.reduce((n, c) => n + c.length, 0)
      const out = new Uint8Array(total)
      let offset = 0
      for (const c of chunks) { out.set(c, offset); offset += c.length }
      resolve(out)
    })
    doc.on('error', reject)

    const LM = 50    // left margin
    const RM = 545   // right edge (A4 = 595pt, margins 50pt each)
    const CW = 495   // content width
    const COL = 220  // value column X

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .fontSize(22).font('Helvetica-Bold')
      .text(d.gymName, LM, 50, { align: 'center', width: CW })

    doc
      .fontSize(11).font('Helvetica').fillColor('#666666')
      .text('COMPROBANTE DE PAGO', LM, doc.y + 6, { align: 'center', width: CW })
      .fillColor('#000000')

    let y = doc.y + 18
    doc.moveTo(LM, y).lineTo(RM, y).strokeColor('#cccccc').lineWidth(0.5).stroke()
    y += 20

    // ── Invoice meta ──────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').text('No. Comprobante:', LM, y, { width: 165 })
    doc.fontSize(10).font('Helvetica').text(d.invoiceNumber, COL, y, { width: RM - COL })
    y += 18

    doc.fontSize(10).font('Helvetica-Bold').text('Fecha de pago:', LM, y, { width: 165 })
    doc.fontSize(10).font('Helvetica').text(d.paymentDate, COL, y, { width: RM - COL })
    y += 28

    // ── Divider before details ────────────────────────────────────────────────
    doc.moveTo(LM, y).lineTo(RM, y).strokeColor('#eeeeee').lineWidth(0.5).stroke()
    y += 16

    // ── Detail rows ───────────────────────────────────────────────────────────
    const rows: [string, string][] = [
      ['Cliente:',       d.clientName],
      ['Plan:',          d.planName],
      ['Ciclo de pago:', d.billingCycle],
      ['Monto pagado:',  d.price],
      ['Referencia:',    d.paymentReference],
      ['Válido hasta:',  d.endDate],
    ]

    for (const [label, value] of rows) {
      doc.fontSize(10).font('Helvetica-Bold').text(label, LM, y, { width: 165 })
      doc.fontSize(10).font('Helvetica').text(value, COL, y, { width: RM - COL })
      y += 22
    }

    y += 26

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveTo(LM, y).lineTo(RM, y).strokeColor('#cccccc').lineWidth(0.5).stroke()
    y += 14

    doc
      .fontSize(8).fillColor('#999999')
      .text(
        'Documento generado automáticamente. No constituye factura electrónica oficial ante Hacienda.',
        LM, y, { align: 'center', width: CW },
      )

    doc.end()
  })
}

// ── Build receipt attachments for plan.purchased ─────────────────────────────
async function buildReceiptAttachments(d: ReceiptData): Promise<Attachment[]> {
  const slug = d.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '-')
  const [pdfBytes] = await Promise.all([generateReceiptPDF(d)])
  const xmlString = generateReceiptXML(d)
  return [
    {
      filename:    `comprobante-${slug}.pdf`,
      content:     pdfBytes,
      contentType: 'application/pdf',
    },
    {
      filename:    `comprobante-${slug}.xml`,
      content:     xmlString,
      contentType: 'application/xml; charset=utf-8',
    },
  ]
}

// ── UUID validation helper ────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Allowed event types (whitelist) ─────────────────────────────────────────
const VALID_EVENT_TYPES = new Set([
  'appointment.created', 'appointment.confirmed', 'appointment.cancelled',
  'appointment.reminder', 'plan.purchased', 'plan.expiring', 'plan.expired',
  'promotion.used', 'client.approved', 'client.welcome', 'client.invitation',
  'payment.failed', 'subscription.cancelled',
])

// ── Service client (module-level, reused across requests) ───────────────────
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  // ── Auth: two paths ─────────────────────────────────────────────
  // Path A — internal call from DB trigger / cron:
  //   Header x-webhook-secret must match the vault-stored secret.
  //   tenant_id is trusted from the JSON body (trigger already validated the row).
  // Path B — external call (e.g. from a server action):
  //   Standard Supabase Bearer JWT + tenant membership check.

  const webhookSecret = req.headers.get('x-webhook-secret')
  const authHeader    = req.headers.get('Authorization')

  // Reject oversized bodies before reading (triggers send tiny JSON payloads;
  // anything over 8 KB is suspicious and could be a DoS attempt)
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > 8192) {
    return new Response('Payload Too Large', { status: 413 })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { event_type, tenant_id } = payload

  // Input validation (applied regardless of auth path)
  if (!event_type || !VALID_EVENT_TYPES.has(event_type)) {
    return new Response('Invalid event_type', { status: 400 })
  }
  if (!tenant_id || !UUID_RE.test(tenant_id)) {
    return new Response('Invalid tenant_id', { status: 400 })
  }
  if (payload.appointment_id  && !UUID_RE.test(payload.appointment_id))  return new Response('Invalid appointment_id',  { status: 400 })
  if (payload.subscription_id && !UUID_RE.test(payload.subscription_id)) return new Response('Invalid subscription_id', { status: 400 })
  if (payload.user_id         && !UUID_RE.test(payload.user_id))         return new Response('Invalid user_id',         { status: 400 })
  if (payload.invitation_id   && !UUID_RE.test(payload.invitation_id))   return new Response('Invalid invitation_id',   { status: 400 })

  if (webhookSecret) {
    // ── Path A: internal DB trigger / cron ──────────────────────
    const { data: secretRow } = await supabaseAdmin
      .rpc('get_webhook_secret') as { data: string | null; error: unknown }

    if (!secretRow || webhookSecret !== secretRow) {
      return new Response('Forbidden', { status: 403 })
    }
    // Verify the tenant actually exists (prevents spoofed tenant_id payloads)
    const { data: tenantExists } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('id', tenant_id)
      .maybeSingle()
    if (!tenantExists) {
      return new Response('Unknown tenant', { status: 403 })
    }
  } else {
    // ── Path B: external Bearer JWT ─────────────────────────────
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user: callerUser } } = await callerClient.auth.getUser()
    if (!callerUser) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', callerUser.id)
      .single()

    if (!callerProfile || callerProfile.tenant_id !== tenant_id) {
      return new Response('Forbidden', { status: 403 })
    }
  }

  // Service client for privileged DB operations (emails, SMTP config, etc.)
  const supabase = supabaseAdmin

  // ── client.invitation: transactional, not template/rule-driven ─────
  // Unlike every other event type, an invitation has no recipient profile
  // yet (that's the whole point) and isn't something tenants customize
  // via Correspondencia — it's a structural "here's your join link" email,
  // built inline the same way the plan.purchased PDF receipt is.
  if (event_type === 'client.invitation') {
    if (!payload.invitation_id) {
      return new Response('Missing invitation_id', { status: 400 })
    }

    const { data: invitation } = await supabase
      .from('client_invitations')
      .select('email, full_name, token')
      .eq('id', payload.invitation_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!invitation) {
      return new Response(JSON.stringify({ processed: 0, reason: 'invitation not found' }), { status: 200 })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, primary_color')
      .eq('id', tenant_id)
      .single()

    const gymName    = tenant?.name ?? 'ARGYM'
    const brandColor = tenant?.primary_color || '#6366f1'
    const siteUrl    = Deno.env.get('SITE_URL') ?? 'https://argym.app'
    const inviteUrl  = `${siteUrl}/invite/${invitation.token}`

    const { data: smtp } = await supabase
      .from('smtp_configs')
      .select('host, port, username, password, from_email, from_name')
      .eq('tenant_id', tenant_id)
      .maybeSingle()

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendFrom   = Deno.env.get('RESEND_FROM_EMAIL') ?? 'ARGYM <noreply@argym.app>'
    const hasSmtp      = !!(smtp?.host && smtp.username && smtp.password)

    if (!hasSmtp && !resendApiKey) {
      return new Response(JSON.stringify({ processed: 0, reason: 'no smtp config and no resend fallback' }), { status: 200 })
    }

    const subject = `Invitación a ${gymName}`
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111827;">
        <h2 style="color:${brandColor};margin:0 0 16px;font-size:20px;">¡Bienvenido a ${gymName}!</h2>
        <p style="font-size:15px;line-height:1.6;">Hola ${invitation.full_name},</p>
        <p style="font-size:15px;line-height:1.6;">
          Fuiste invitado a unirte a <strong>${gymName}</strong>. Al crear tu cuenta con este correo
          (${invitation.email}), tu acceso queda activo de inmediato — sin esperar aprobación.
        </p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${inviteUrl}" style="background:${brandColor};color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            Unirme a ${gymName}
          </a>
        </p>
        <p style="font-size:12px;color:#6b7280;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>${inviteUrl}</p>
      </div>`

    const from = hasSmtp && smtp ? `"${smtp.from_name}" <${smtp.from_email}>` : resendFrom
    let status = 'sent'
    let errorMsg: string | null = null

    try {
      if (hasSmtp && smtp) {
        const port = Number(smtp.port)
        const transporter = createTransport({
          host: smtp.host, port, secure: port === 465, requireTLS: port === 587,
          auth: { user: smtp.username, pass: smtp.password },
          tls: { rejectUnauthorized: false },
        })
        await transporter.sendMail({ from, to: invitation.email, subject, html })
      } else {
        const res = await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ from, to: [invitation.email], subject, html }),
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`Resend API error ${res.status}: ${body}`)
        }
      }
    } catch (err) {
      status   = 'failed'
      errorMsg = err instanceof Error ? err.message : String(err)
    }

    await supabase.from('email_logs').insert({
      tenant_id,
      to_email:  invitation.email,
      subject,
      body_html: html,
      status,
      error_msg: errorMsg,
      sent_at:   status === 'sent' ? new Date().toISOString() : null,
    })

    return new Response(JSON.stringify({ processed: status === 'sent' ? 1 : 0, status }), {
      headers: { 'Content-Type': 'application/json' },
      status:  200,
    })
  }

  // ── 1. Matching active rules ────────────────────────────────────
  const { data: rules, error: rulesErr } = await supabase
    .from('communication_rules')
    .select('id, recipients, delay_minutes, channel, email_templates(id, subject, body_html), whatsapp_templates(id, body_text)')
    .eq('tenant_id', tenant_id)
    .eq('event_type', event_type)
    .eq('is_active', true)
    .or('template_id.not.is.null,whatsapp_template_id.not.is.null')

  if (rulesErr || !rules?.length) {
    return new Response(
      JSON.stringify({ processed: 0, reason: rulesErr?.message ?? 'no rules' }),
      { status: 200 },
    )
  }

  const emailRules    = rules.filter((r) => (r.channel ?? 'email') === 'email')
  const whatsappRules = rules.filter((r) => r.channel === 'whatsapp')

  // ── 2. SMTP config + Resend fallback ───────────────────────────
  const { data: smtp } = await supabase
    .from('smtp_configs')
    .select('host, port, username, password, from_email, from_name')
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  const resendApiKey  = Deno.env.get('RESEND_API_KEY')
  const resendFrom    = Deno.env.get('RESEND_FROM_EMAIL') ?? 'ARGYM <noreply@argym.app>'
  const hasSmtp       = !!(smtp?.host && smtp.username && smtp.password)
  const hasResend     = !!resendApiKey

  // Only bail out entirely if there's nothing at all to process — email
  // rules with no email transport AND no WhatsApp rules to fall back to.
  if (!hasSmtp && !hasResend && emailRules.length > 0 && whatsappRules.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, reason: 'no smtp config and no resend fallback' }),
      { status: 200 },
    )
  }

  // ── WhatsApp (Meta Cloud API) — gated behind these two secrets. Until
  // both are set, every whatsapp-channel rule logs 'not_configured' per
  // attempt instead of silently doing nothing.
  const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  const whatsappPhoneId     = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const hasWhatsApp = !!(whatsappAccessToken && whatsappPhoneId)

  async function sendWhatsApp(to: string, message: string): Promise<void> {
    const res = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappAccessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`WhatsApp API error ${res.status}: ${body}`)
    }
  }

  // ── 3. Tenant ───────────────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, primary_color')
    .eq('id', tenant_id)
    .single()

  const gymName    = tenant?.name ?? 'ARGYM'
  const brandColor = tenant?.primary_color || '#6366f1'
  const loginUrl   = Deno.env.get('SITE_URL') ?? 'https://argym.app'

  const getEmail = async (userId: string): Promise<string> => {
    const { data } = await supabase.auth.admin.getUserById(userId)
    return data?.user?.email ?? ''
  }

  const getPhone = async (userId: string): Promise<string> => {
    const { data } = await supabase.from('profiles').select('phone').eq('id', userId).single()
    return data?.phone ?? ''
  }

  // ── 4. Context data + template vars ────────────────────────────
  // brand_color resolves per-tenant from that gym's own primary_color, never
  // a hardcoded value — this is what keeps one gym's brand out of another's
  // emails when templates are shared from the canonical seed (see migration
  // 20240101000134).
  let templateVars: Record<string, string> = { gym_name: gymName, login_url: loginUrl, brand_color: brandColor }
  let clientEmail = ''
  let coachEmail  = ''
  let clientPhone = ''
  let coachPhone  = ''
  let adminEmails: string[] = []
  let adminPhones: string[] = []
  let attachments: Attachment[] = []

  if (event_type.startsWith('appointment.') && payload.appointment_id) {
    // ── Appointment event ─────────────────────────────────────────
    const { data: appt } = await supabase
      .from('appointments')
      .select('id, start_time, appointment_type, title, client_id, coach_id, location')
      .eq('id', payload.appointment_id)
      .single()

    if (!appt) {
      return new Response(
        JSON.stringify({ processed: 0, reason: 'appointment not found' }),
        { status: 200 },
      )
    }

    const profileIds = [appt.client_id, appt.coach_id].filter(Boolean)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', profileIds)

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]),
    )

    ;[clientEmail, coachEmail] = await Promise.all([
      appt.client_id ? getEmail(appt.client_id) : Promise.resolve(''),
      appt.coach_id  ? getEmail(appt.coach_id)  : Promise.resolve(''),
    ])
    ;[clientPhone, coachPhone] = await Promise.all([
      appt.client_id ? getPhone(appt.client_id) : Promise.resolve(''),
      appt.coach_id  ? getPhone(appt.coach_id)  : Promise.resolve(''),
    ])

    const startTime = new Date(appt.start_time)
    // Only meaningful for in-person appointments — virtual/phone ones have
    // no physical location to send map links for.
    const hasLocation = appt.appointment_type === 'in_person' && !!appt.location
    const gMapsUrl = hasLocation
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.location)}`
      : ''
    const wazeUrl = hasLocation
      ? `https://waze.com/ul?q=${encodeURIComponent(appt.location)}&navigate=yes`
      : ''
    // Two variants: the appointment.created template lays out each field
    // as a <p>, the other three (confirmed/cancelled/reminder) use a
    // <table><tr><td> info block — each stays empty for non in-person
    // appointments so nothing renders instead of a dead/empty row.
    const locationRow = hasLocation
      ? `<p style="margin:8px 0;font-size:16px;">📍 <strong>Ubicación:</strong> ${appt.location} — <a href="${gMapsUrl}" style="color:#2563eb;">Google Maps</a> · <a href="${wazeUrl}" style="color:#2563eb;">Waze</a></p>`
      : ''
    const locationRowTable = hasLocation
      ? `<tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">📍 Ubicación</td><td style="padding:5px 0;font-weight:600;color:#111827">${appt.location}<br/><a href="${gMapsUrl}" style="color:#2563eb;">Google Maps</a> · <a href="${wazeUrl}" style="color:#2563eb;">Waze</a></td></tr>`
      : ''

    templateVars = {
      ...templateVars,
      client_name:      profileMap.get(appt.client_id) ?? 'Cliente',
      coach_name:       profileMap.get(appt.coach_id)  ?? 'Entrenador',
      appointment_date: startTime.toLocaleDateString('es-CR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'America/Costa_Rica',
      }),
      appointment_time: startTime.toLocaleTimeString('es-CR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica',
      }),
      plan_name: appt.appointment_type ?? appt.title ?? 'Entrenamiento',
      location: appt.location ?? '',
      location_row: locationRow,
      location_row_table: locationRowTable,
    }
  } else if (
    (event_type.startsWith('plan.') || event_type.startsWith('promotion.') ||
     event_type === 'payment.failed' || event_type === 'subscription.cancelled') &&
    payload.subscription_id
  ) {
    // ── Subscription / plan event ─────────────────────────────────
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, final_price, start_date, end_date, payment_reference, plans!plan_id(name, currency, billing_cycle)')
      .eq('id', payload.subscription_id)
      .single()

    if (!sub) {
      return new Response(
        JSON.stringify({ processed: 0, reason: 'subscription not found' }),
        { status: 200 },
      )
    }

    const plan = sub.plans as { name: string; currency: string; billing_cycle: string } | null

    const billingLabel =
      plan?.billing_cycle === 'monthly' ? 'Mensual'
      : plan?.billing_cycle === 'yearly' ? 'Anual'
      : 'Pago único'

    const currency   = plan?.currency ?? 'CRC'
    const rawAmount  = sub.final_price ?? 0

    const priceLabel =
      plan?.currency && sub.final_price != null
        ? `${plan.currency} ${Number(sub.final_price).toLocaleString('es-CR')}`
        : ''

    const fmtDate = (d: string | null) =>
      d
        ? new Date(d).toLocaleDateString('es-CR', {
            day: '2-digit', month: 'long', year: 'numeric',
            timeZone: 'America/Costa_Rica',
          })
        : 'Sin vencimiento'

    const endDateLabel     = (sub as any).end_date ? fmtDate((sub as any).end_date) : 'Sin vencimiento'
    const paymentDateLabel = fmtDate((sub as any).start_date ?? new Date().toISOString())

    // Fetch the invoice generated for this subscription
    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('subscription_id', payload.subscription_id)
      .maybeSingle()

    // Client profile + email
    const [{ data: clientProfile }, clientEmailResult, clientPhoneResult] = await Promise.all([
      supabase.from('profiles').select('full_name, phone').eq('id', sub.user_id).single(),
      getEmail(sub.user_id),
      getPhone(sub.user_id),
    ])
    clientEmail = clientEmailResult
    clientPhone = clientPhoneResult

    const clientName = clientProfile?.full_name ?? 'Cliente'
    const planName   = plan?.name ?? 'Plan'
    const invoiceNum = invoice?.invoice_number ?? '—'
    const payRef     = (sub as any).payment_reference ?? '—'

    templateVars = {
      ...templateVars,
      client_name:       clientName,
      plan_name:         planName,
      billing_cycle:     billingLabel,
      price:             priceLabel,
      payment_date:      paymentDateLabel,
      end_date:          endDateLabel,
      invoice_number:    invoiceNum,
      payment_reference: payRef,
    }

    // ── Generate PDF + XML attachments for plan.purchased ──────────
    if (event_type === 'plan.purchased') {
      try {
        attachments = await buildReceiptAttachments({
          invoiceNumber:    invoiceNum,
          gymName,
          clientName,
          planName,
          billingCycle:     billingLabel,
          price:            priceLabel,
          currency,
          amount:           Number(rawAmount),
          paymentDate:      paymentDateLabel,
          endDate:          endDateLabel,
          paymentReference: payRef,
        })
      } catch (attachErr) {
        console.error('Receipt attachment generation failed:', attachErr)
        // Fall through — email is sent without attachments
      }
    }

    // Fetch admin users for this tenant (for rules with recipients = 'admin' or 'all')
    const needsAdmin = rules.some((r) =>
      r.recipients === 'admin' || r.recipients === 'all',
    )
    if (needsAdmin) {
      const { data: adminRoles } = await supabase
        .from('roles')
        .select('id')
        .in('name', ['admin', 'full_access'])

      if (adminRoles?.length) {
        const { data: adminUserRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('tenant_id', tenant_id)
          .in('role_id', adminRoles.map((r) => r.id))

        adminEmails = (
          await Promise.all(
            (adminUserRoles ?? []).map((ur: { user_id: string }) => getEmail(ur.user_id)),
          )
        ).filter(Boolean)
        adminPhones = (
          await Promise.all(
            (adminUserRoles ?? []).map((ur: { user_id: string }) => getPhone(ur.user_id)),
          )
        ).filter(Boolean)
      }
    }
  } else if (event_type.startsWith('client.') && payload.user_id) {
    // ── Client account events (approved, welcome) ─────────────────
    const [{ data: profile }, userEmail, userPhone] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', payload.user_id).single(),
      getEmail(payload.user_id),
      getPhone(payload.user_id),
    ])
    clientEmail = userEmail
    clientPhone = userPhone

    templateVars = {
      ...templateVars,
      client_name: profile?.full_name ?? 'Cliente',
    }

    const needsAdmin = rules.some((r) => r.recipients === 'admin' || r.recipients === 'all')
    if (needsAdmin) {
      const { data: adminRoles } = await supabase
        .from('roles').select('id').in('name', ['admin', 'full_access'])

      if (adminRoles?.length) {
        const { data: adminUserRoles } = await supabase
          .from('user_roles').select('user_id')
          .eq('tenant_id', tenant_id).in('role_id', adminRoles.map((r) => r.id))

        adminEmails = (
          await Promise.all(
            (adminUserRoles ?? []).map((ur: { user_id: string }) => getEmail(ur.user_id)),
          )
        ).filter(Boolean)
        adminPhones = (
          await Promise.all(
            (adminUserRoles ?? []).map((ur: { user_id: string }) => getPhone(ur.user_id)),
          )
        ).filter(Boolean)
      }
    }
  }

  // ── 5. Render helper ────────────────────────────────────────────
  const render = (tmpl: string) =>
    tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => templateVars[k] ?? `{{${k}}}`)

  // ── 6. Email sender (SMTP or Resend fallback) ──────────────────
  let smtpTransporter: ReturnType<typeof createTransport> | null = null
  if (hasSmtp && smtp) {
    const port = Number(smtp.port)
    smtpTransporter = createTransport({
      host:       smtp.host,
      port,
      secure:     port === 465,
      requireTLS: port === 587,
      auth: { user: smtp.username, pass: smtp.password },
      tls: { rejectUnauthorized: false },
    })
  }

  const sendEmail = async (opts: {
    from: string
    to: string
    subject: string
    html: string
    attachments?: Attachment[]
  }): Promise<void> => {
    if (smtpTransporter) {
      await smtpTransporter.sendMail({
        from:        opts.from,
        to:          opts.to,
        subject:     opts.subject,
        html:        opts.html,
        attachments: opts.attachments?.length ? opts.attachments : undefined,
      })
    } else {
      // Resend REST API fallback
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    resendFrom,
          to:      [opts.to],
          subject: opts.subject,
          html:    opts.html,
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Resend API error ${res.status}: ${body}`)
      }
    }
  }

  const senderFrom = hasSmtp && smtp
    ? `"${smtp.from_name}" <${smtp.from_email}>`
    : resendFrom

  // ── 7. Send per rule (email) ─────────────────────────────────────
  let processed = 0

  for (const rule of emailRules) {
    const tpl = rule.email_templates as
      | { id: string; subject: string; body_html: string }
      | null
    if (!tpl) continue

    const subject  = render(tpl.subject)
    const bodyHtml = render(tpl.body_html)

    // Resolve recipient emails for this rule
    const toEmails: string[] = []
    if (['client', 'client_and_coach', 'all'].includes(rule.recipients) && clientEmail) {
      toEmails.push(clientEmail)
    }
    if (['coach', 'client_and_coach', 'all'].includes(rule.recipients) && coachEmail) {
      toEmails.push(coachEmail)
    }
    if (['admin', 'all'].includes(rule.recipients)) {
      toEmails.push(...adminEmails)
    }

    for (const toEmail of toEmails) {
      let status   = 'sent'
      let errorMsg: string | null = null

      try {
        await sendEmail({
          from:        senderFrom,
          to:          toEmail,
          subject,
          html:        bodyHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
        })
        processed++
      } catch (err) {
        status   = 'failed'
        errorMsg = err instanceof Error ? err.message : String(err)
      }

      await supabase.from('email_logs').insert({
        tenant_id,
        rule_id:     rule.id,
        template_id: tpl.id,
        to_email:    toEmail,
        subject,
        body_html:   bodyHtml,
        status,
        error_msg:   errorMsg,
        sent_at:     status === 'sent' ? new Date().toISOString() : null,
      })
    }
  }

  // ── 8. Send per rule (WhatsApp) ──────────────────────────────────
  // Every attempt gets a whatsapp_logs row regardless of outcome — an
  // admin looking at Correspondencia sees exactly why nothing went out
  // (not_configured vs. a real API failure), never silence.
  let whatsappProcessed = 0
  let whatsappSkippedReason: string | null = null

  for (const rule of whatsappRules) {
    const tpl = rule.whatsapp_templates as { id: string; body_text: string } | null
    if (!tpl) continue

    const message = render(tpl.body_text)

    const toPhones: string[] = []
    if (['client', 'client_and_coach', 'all'].includes(rule.recipients) && clientPhone) {
      toPhones.push(clientPhone)
    }
    if (['coach', 'client_and_coach', 'all'].includes(rule.recipients) && coachPhone) {
      toPhones.push(coachPhone)
    }
    if (['admin', 'all'].includes(rule.recipients)) {
      toPhones.push(...adminPhones)
    }

    for (const toPhone of toPhones) {
      let status: 'sent' | 'failed' | 'not_configured' = 'sent'
      let errorMsg: string | null = null

      if (!hasWhatsApp) {
        status = 'not_configured'
        errorMsg = 'WhatsApp no configurado (falta WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)'
        whatsappSkippedReason = 'whatsapp not configured'
      } else {
        try {
          await sendWhatsApp(toPhone, message)
          whatsappProcessed++
        } catch (err) {
          status = 'failed'
          errorMsg = err instanceof Error ? err.message : String(err)
        }
      }

      await supabase.from('whatsapp_logs').insert({
        tenant_id,
        rule_id:     rule.id,
        template_id: tpl.id,
        to_phone:    toPhone,
        message,
        status,
        error_msg:   errorMsg,
        sent_at:     status === 'sent' ? new Date().toISOString() : null,
      })
    }
  }

  return new Response(JSON.stringify({
    processed,
    whatsapp: { processed: whatsappProcessed, reason: whatsappSkippedReason },
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
