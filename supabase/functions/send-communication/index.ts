import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTransport } from 'npm:nodemailer'

// JWT verification is disabled for this function (set in config.toml).
// Called exclusively from our internal DB trigger.

interface Payload {
  event_type:     string
  appointment_id: string
  tenant_id:      string
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { event_type, appointment_id, tenant_id } = payload
  if (!event_type || !appointment_id || !tenant_id) {
    return new Response('Missing required fields', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── 1. Find active matching rules (with templates) ──────────────
  const { data: rules, error: rulesErr } = await supabase
    .from('communication_rules')
    .select('id, recipients, delay_minutes, email_templates(id, subject, body_html)')
    .eq('tenant_id', tenant_id)
    .eq('event_type', event_type)
    .eq('is_active', true)
    .not('template_id', 'is', null)

  if (rulesErr || !rules?.length) {
    return new Response(JSON.stringify({ processed: 0, reason: rulesErr?.message ?? 'no rules' }), { status: 200 })
  }

  // ── 2. SMTP config ──────────────────────────────────────────────
  const { data: smtp } = await supabase
    .from('smtp_configs')
    .select('host, port, username, password, from_email, from_name')
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  if (!smtp?.host || !smtp.username || !smtp.password) {
    return new Response(JSON.stringify({ processed: 0, reason: 'no smtp config' }), { status: 200 })
  }

  // ── 3. Appointment + profiles ───────────────────────────────────
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, start_time, appointment_type, title, client_id, coach_id')
    .eq('id', appointment_id)
    .single()

  if (!appt) {
    return new Response(JSON.stringify({ processed: 0, reason: 'appointment not found' }), { status: 200 })
  }

  // Fetch names from profiles
  const profileIds = [appt.client_id, appt.coach_id].filter(Boolean)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', profileIds)

  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]))

  // Fetch emails via auth.admin (service role required)
  const getEmail = async (userId: string | null): Promise<string> => {
    if (!userId) return ''
    const { data } = await supabase.auth.admin.getUserById(userId)
    return data?.user?.email ?? ''
  }

  const [clientEmail, coachEmail] = await Promise.all([
    getEmail(appt.client_id),
    getEmail(appt.coach_id),
  ])

  // ── 4. Tenant name ──────────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenant_id)
    .single()

  // ── 5. Template variables ───────────────────────────────────────
  const startTime = new Date(appt.start_time)
  const vars: Record<string, string> = {
    client_name:      profileMap.get(appt.client_id) ?? 'Cliente',
    coach_name:       profileMap.get(appt.coach_id)  ?? 'Entrenador',
    appointment_date: startTime.toLocaleDateString('es-CR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Costa_Rica',
    }),
    appointment_time: startTime.toLocaleTimeString('es-CR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica',
    }),
    plan_name:  appt.appointment_type ?? appt.title ?? 'Entrenamiento',
    gym_name:   tenant?.name ?? 'ARGYM',
    login_url:  Deno.env.get('SITE_URL') ?? 'https://argym.app',
  }

  const render = (tmpl: string) =>
    tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)

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

  // ── 7. Send for each rule ───────────────────────────────────────
  let processed = 0

  for (const rule of rules) {
    const tpl = rule.email_templates as { id: string; subject: string; body_html: string } | null
    if (!tpl) continue

    const subject  = render(tpl.subject)
    const bodyHtml = render(tpl.body_html)

    // Resolve recipient list
    const toEmails: string[] = []
    if (['client', 'client_and_coach', 'all'].includes(rule.recipients) && clientEmail) {
      toEmails.push(clientEmail)
    }
    if (['coach', 'client_and_coach', 'all'].includes(rule.recipients) && coachEmail) {
      toEmails.push(coachEmail)
    }

    for (const toEmail of toEmails) {
      let status = 'sent'
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
