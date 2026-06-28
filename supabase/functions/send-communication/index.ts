import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTransport } from 'npm:nodemailer'

interface Payload {
  event_type:       string
  tenant_id:        string
  appointment_id?:  string
  subscription_id?: string
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

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

    const endDateLabel =
      (sub as any).end_date ? fmtDate((sub as any).end_date) : 'Sin vencimiento'

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

    templateVars = {
      ...templateVars,
      client_name:        clientProfile?.full_name ?? 'Cliente',
      plan_name:          plan?.name ?? 'Plan',
      billing_cycle:      billingLabel,
      price:              priceLabel,
      payment_date:       paymentDateLabel,
      end_date:           endDateLabel,
      invoice_number:     invoice?.invoice_number ?? '—',
      payment_reference:  (sub as any).payment_reference ?? '—',
    }

    // Fetch admin users for this tenant (for rules with recipients = 'admin')
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
          from:    `"${smtp.from_name}" <${smtp.from_email}>`,
          to:      toEmail,
          subject,
          html:    bodyHtml,
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
