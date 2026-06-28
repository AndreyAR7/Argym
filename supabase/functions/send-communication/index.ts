import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTransport } from 'npm:nodemailer'
import PDFDocument from 'npm:pdfkit'

interface Payload {
  event_type:       string
  tenant_id:        string
  appointment_id?:  string
  subscription_id?: string
  user_id?:         string
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

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  // ── Validate caller identity ────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
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

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { event_type, tenant_id } = payload
  if (!event_type || !tenant_id) {
    return new Response('Missing required fields', { status: 400 })
  }

  // Validate the caller's tenant matches the requested tenant
  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', callerUser.id)
    .single()

  if (!callerProfile || callerProfile.tenant_id !== tenant_id) {
    return new Response('Forbidden', { status: 403 })
  }

  // Service client for privileged DB operations (emails, SMTP config, etc.)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── 1. Matching active rules ────────────────────────────────────
  const { data: rules, error: rulesErr } = await supabase
    .from('communication_rules')
    .select('id, recipients, delay_minutes, email_templates(id, subject, body_html)')
    .eq('tenant_id', tenant_id)
    .eq('event_type', event_type)
    .eq('is_active', true)
    .not('template_id', 'is', null)

  if (rulesErr || !rules?.length) {
    return new Response(
      JSON.stringify({ processed: 0, reason: rulesErr?.message ?? 'no rules' }),
      { status: 200 },
    )
  }

  // ── 2. SMTP config ──────────────────────────────────────────────
  const { data: smtp } = await supabase
    .from('smtp_configs')
    .select('host, port, username, password, from_email, from_name')
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  if (!smtp?.host || !smtp.username || !smtp.password) {
    return new Response(
      JSON.stringify({ processed: 0, reason: 'no smtp config' }),
      { status: 200 },
    )
  }

  // ── 3. Tenant ───────────────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenant_id)
    .single()

  const gymName  = tenant?.name ?? 'ARGYM'
  const loginUrl = Deno.env.get('SITE_URL') ?? 'https://argym.app'

  const getEmail = async (userId: string): Promise<string> => {
    const { data } = await supabase.auth.admin.getUserById(userId)
    return data?.user?.email ?? ''
  }

  // ── 4. Context data + template vars ────────────────────────────
  let templateVars: Record<string, string> = { gym_name: gymName, login_url: loginUrl }
  let clientEmail = ''
  let coachEmail  = ''
  let adminEmails: string[] = []
  let attachments: Attachment[] = []

  if (event_type.startsWith('appointment.') && payload.appointment_id) {
    // ── Appointment event ─────────────────────────────────────────
    const { data: appt } = await supabase
      .from('appointments')
      .select('id, start_time, appointment_type, title, client_id, coach_id')
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

    const startTime = new Date(appt.start_time)
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
    }
  } else if (
    (event_type.startsWith('plan.') || event_type.startsWith('promotion.')) &&
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
    const [{ data: clientProfile }, clientEmailResult] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', sub.user_id).single(),
      getEmail(sub.user_id),
    ])
    clientEmail = clientEmailResult

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
      const { data: adminRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'admin')
        .single()

      if (adminRole) {
        const { data: adminUserRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('tenant_id', tenant_id)
          .eq('role_id', adminRole.id)

        adminEmails = (
          await Promise.all(
            (adminUserRoles ?? []).map((ur: { user_id: string }) => getEmail(ur.user_id)),
          )
        ).filter(Boolean)
      }
    }
  } else if (event_type.startsWith('client.') && payload.user_id) {
    // ── Client account events (approved, welcome) ─────────────────
    const [{ data: profile }, userEmail] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', payload.user_id).single(),
      getEmail(payload.user_id),
    ])
    clientEmail = userEmail

    templateVars = {
      ...templateVars,
      client_name: profile?.full_name ?? 'Cliente',
    }

    const needsAdmin = rules.some((r) => r.recipients === 'admin' || r.recipients === 'all')
    if (needsAdmin) {
      const { data: adminRole } = await supabase
        .from('roles').select('id').eq('name', 'admin').single()

      if (adminRole) {
        const { data: adminUserRoles } = await supabase
          .from('user_roles').select('user_id')
          .eq('tenant_id', tenant_id).eq('role_id', adminRole.id)

        adminEmails = (
          await Promise.all(
            (adminUserRoles ?? []).map((ur: { user_id: string }) => getEmail(ur.user_id)),
          )
        ).filter(Boolean)
      }
    }
  }

  // ── 5. Render helper ────────────────────────────────────────────
  const render = (tmpl: string) =>
    tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => templateVars[k] ?? `{{${k}}}`)

  // ── 6. SMTP transporter ─────────────────────────────────────────
  const port = Number(smtp.port)
  const transporter = createTransport({
    host:       smtp.host,
    port,
    secure:     port === 465,
    requireTLS: port === 587,
    auth: { user: smtp.username, pass: smtp.password },
    tls: { rejectUnauthorized: false },
  })

  // ── 7. Send per rule ────────────────────────────────────────────
  let processed = 0

  for (const rule of rules) {
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
        await transporter.sendMail({
          from:        `"${smtp.from_name}" <${smtp.from_email}>`,
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
        status,
        error_msg:   errorMsg,
        sent_at:     status === 'sent' ? new Date().toISOString() : null,
      })
    }
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
