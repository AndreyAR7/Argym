import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTransport } from 'npm:nodemailer'

// Runs the same SMTP verify/send/resend logic previously done directly in
// the Next.js web app (apps/web/src/app/admin/correspondencia/actions.ts).
// That code runs on Render, whose free web-service tier blocks outbound
// SMTP ports (25/465/587) — this edge function runs on Supabase's own
// infrastructure instead, the same place the real automated
// communication_rules emails (send-communication) already send from
// successfully, so it isn't subject to that block.

interface Payload {
  tenant_id: string
  mode:      'test' | 'resend' | 'bulk_resend'
  to_email?: string   // mode: test
  log_id?:   string   // mode: resend
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function buildTransporter(config: { host: string; port: number; username: string; password: string }) {
  const port = Number(config.port)
  return createTransport({
    host:       config.host,
    port,
    secure:     port === 465,
    requireTLS: port === 587,
    auth: { user: config.username, pass: config.password },
    tls: { rejectUnauthorized: false },
  })
}

function classifyError(err: unknown, host: string, port: number): string {
  const message = err instanceof Error ? err.message : String(err)
  const code    = (err as { responseCode?: number; code?: string })?.responseCode
    ?? (err as { code?: string })?.code ?? ''

  if (
    String(code) === '535' || message.includes('535') || message.includes('Invalid login') ||
    message.includes('Username and Password') || message.includes('BadCredentials')
  ) {
    const isGmail = host.includes('gmail')
    const hint = isGmail
      ? 'Para Gmail: 1) Activa la verificación en 2 pasos en la cuenta, 2) genera una Contraseña de Aplicación en Seguridad → Contraseñas de aplicaciones, 3) pega los 16 caracteres sin espacios.'
      : 'Verifica el usuario y contraseña. Si usas Gmail, necesitas una Contraseña de Aplicación.'
    return `Autenticación rechazada (535). ${hint}`
  }
  if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT') || message.includes('ENOTFOUND')) {
    return `No se puede conectar a ${host}:${port}. Verifica host y puerto.`
  }
  return `Error SMTP: [${code}] ${message}`
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), { status: 401 })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, message: 'Invalid JSON' }), { status: 400 })
  }

  const { tenant_id, mode } = payload
  if (!tenant_id || !UUID_RE.test(tenant_id)) {
    return new Response(JSON.stringify({ ok: false, message: 'Invalid tenant_id' }), { status: 400 })
  }
  if (!['test', 'resend', 'bulk_resend'].includes(mode)) {
    return new Response(JSON.stringify({ ok: false, message: 'Invalid mode' }), { status: 400 })
  }

  // Caller must belong to the tenant they're operating on.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user: callerUser } } = await callerClient.auth.getUser()
  if (!callerUser) {
    return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), { status: 401 })
  }
  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', callerUser.id)
    .single()
  if (!callerProfile || callerProfile.tenant_id !== tenant_id) {
    return new Response(JSON.stringify({ ok: false, message: 'Forbidden' }), { status: 403 })
  }

  const supabase = supabaseAdmin

  const { data: config, error: cfgErr } = await supabase
    .from('smtp_configs')
    .select('host, port, username, password, from_email, from_name, use_tls')
    .eq('tenant_id', tenant_id)
    .maybeSingle()

  if (cfgErr) {
    return new Response(JSON.stringify({ ok: false, message: `Error al leer configuración: ${cfgErr.message}` }), { status: 200 })
  }
  if (!config?.host || !config.username || !config.password) {
    return new Response(JSON.stringify({ ok: false, message: 'La configuración SMTP está incompleta o no existe.' }), { status: 200 })
  }

  const port = Number(config.port)

  // ── mode: test ──────────────────────────────────────────────────
  if (mode === 'test') {
    if (!payload.to_email) {
      return new Response(JSON.stringify({ ok: false, message: 'Falta to_email' }), { status: 400 })
    }
    const transporter = buildTransporter(config)

    try {
      await Promise.race([
        transporter.verify(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' })), 15000),
        ),
      ])
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, message: classifyError(err, config.host, port) }), { status: 200 })
    }

    const { data: tenant } = await supabase.from('tenants').select('name').eq('id', tenant_id).single()
    const gymName = tenant?.name ?? 'ARGYM'

    try {
      await transporter.sendMail({
        from:    `"${config.from_name || gymName}" <${config.from_email}>`,
        to:      payload.to_email,
        subject: `✅ Prueba de conexión SMTP — ${gymName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:12px">
            <h2 style="margin:0 0 8px;color:#374151;font-size:20px">✅ Conexión SMTP exitosa</h2>
            <p style="margin:0 0 20px;color:#374151;font-size:15px">
              Tu servidor SMTP está correctamente configurado en <strong>${gymName}</strong>.
              Los emails automáticos de reglas y notificaciones se enviarán desde esta cuenta.
            </p>
            <div style="background:#f9fafb;border-radius:8px;padding:14px 16px;font-size:13px;color:#6b7280">
              <strong style="color:#374151">Configuración activa:</strong><br>
              Servidor: <code>${config.host}:${config.port}</code><br>
              Remitente: ${config.from_name} &lt;${config.from_email}&gt;<br>
              TLS: ${config.use_tls ? 'Sí' : 'No'}
            </div>
            <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">Email generado automáticamente · ${gymName} Platform</p>
          </div>
        `,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return new Response(JSON.stringify({ ok: false, message: `Conexión OK pero falló el envío: ${message}` }), { status: 200 })
    }

    return new Response(JSON.stringify({ ok: true, message: `Email de prueba enviado a ${payload.to_email}` }), { status: 200 })
  }

  // ── mode: resend (single) ──────────────────────────────────────
  if (mode === 'resend') {
    if (!payload.log_id || !UUID_RE.test(payload.log_id)) {
      return new Response(JSON.stringify({ ok: false, message: 'Invalid log_id' }), { status: 400 })
    }

    const { data: log, error: logErr } = await supabase
      .from('email_logs')
      .select('to_email, subject, body_html, retry_count, tenant_id')
      .eq('id', payload.log_id)
      .single()

    if (logErr || !log || log.tenant_id !== tenant_id) {
      return new Response(JSON.stringify({ ok: false, message: 'Log no encontrado' }), { status: 200 })
    }
    if (!log.body_html) {
      return new Response(JSON.stringify({ ok: false, message: 'Este email no tiene cuerpo almacenado. Los emails nuevos sí lo guardan.' }), { status: 200 })
    }
    if ((log.retry_count ?? 0) >= 10) {
      return new Response(JSON.stringify({ ok: false, message: 'Límite de reintentos alcanzado (máx 10). Crea un nuevo email desde las reglas.' }), { status: 200 })
    }

    const transporter = buildTransporter(config)
    try {
      await transporter.sendMail({
        from:    `"${config.from_name}" <${config.from_email}>`,
        to:      log.to_email,
        subject: log.subject,
        html:    log.body_html,
      })
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, message: `Error al enviar: ${classifyError(err, config.host, port)}` }), { status: 200 })
    }

    await supabase.from('email_logs').update({
      status: 'sent', sent_at: new Date().toISOString(),
      retry_count: (log.retry_count ?? 0) + 1, last_retry_at: new Date().toISOString(), error_msg: null,
    }).eq('id', payload.log_id)

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  // ── mode: bulk_resend ───────────────────────────────────────────
  const { data: failedLogs } = await supabase
    .from('email_logs')
    .select('id, to_email, subject, body_html, retry_count')
    .eq('tenant_id', tenant_id)
    .eq('status', 'failed')
    .not('body_html', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!failedLogs?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, failed: 0 }), { status: 200 })
  }

  const transporter = buildTransporter(config)
  let sent = 0
  let failed = 0
  const now = new Date().toISOString()

  for (const log of failedLogs) {
    try {
      await transporter.sendMail({
        from:    `"${config.from_name}" <${config.from_email}>`,
        to:      log.to_email,
        subject: log.subject,
        html:    log.body_html,
      })
      await supabase.from('email_logs').update({
        status: 'sent', sent_at: now, retry_count: (log.retry_count ?? 0) + 1, last_retry_at: now, error_msg: null,
      }).eq('id', log.id)
      sent++
    } catch {
      await supabase.from('email_logs').update({
        retry_count: (log.retry_count ?? 0) + 1, last_retry_at: now,
      }).eq('id', log.id)
      failed++
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed }), { status: 200 })
})
