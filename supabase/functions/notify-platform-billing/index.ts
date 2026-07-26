import { createTransport } from 'npm:nodemailer'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Platform → gym-owner billing notices (trial ending, payment failed on the
// tenant's ARGYM subscription itself). Distinct from smtp_configs/
// send-communication, which are per-tenant and used for a gym's own emails
// to ITS clients — there is no tenant SMTP config to reuse here, since the
// tenant is the one being billed. Reuses the same dedicated Gmail account as
// contact-us. Runs as an Edge Function (not a Next.js route) because Render's
// free web-service tier blocks outbound SMTP ports — see contact-us/index.ts.

interface Payload {
  event_type: 'trial_will_end'
  tenant_name: string
  to_emails: string[]
  trial_end_date?: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const webhookSecret = req.headers.get('x-webhook-secret')
  const { data: expectedSecret } = await supabase.rpc('get_webhook_secret') as { data: string | null }
  if (!webhookSecret || !expectedSecret || webhookSecret !== expectedSecret) {
    return new Response('Forbidden', { status: 403 })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ ok: false, message: 'Invalid JSON' }, 400)
  }

  const { event_type, tenant_name, to_emails, trial_end_date } = payload
  if (event_type !== 'trial_will_end') {
    return jsonResponse({ ok: false, message: 'Unsupported event_type' }, 400)
  }
  if (!tenant_name || !Array.isArray(to_emails) || to_emails.length === 0) {
    return jsonResponse({ ok: false, message: 'tenant_name and to_emails are required' }, 400)
  }

  const gmailUser = Deno.env.get('CONTACT_GMAIL_USER')
  const gmailPass = Deno.env.get('CONTACT_GMAIL_APP_PASSWORD')
  if (!gmailUser || !gmailPass) {
    return jsonResponse({ ok: false, message: 'Platform email sender not configured' }, 500)
  }

  const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  })

  const endDateText = trial_end_date
    ? new Date(trial_end_date).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'en los próximos días'

  try {
    await transporter.sendMail({
      from: `"ARGYM" <${gmailUser}>`,
      to: to_emails.join(', '),
      subject: `Tu prueba gratuita de ARGYM termina ${trial_end_date ? `el ${endDateText}` : 'pronto'}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px">Tu prueba gratuita está por terminar</h2>
          <p style="margin:0 0 12px;color:#374151">
            Hola, la prueba gratuita del plan de <strong>${escapeHtml(tenant_name)}</strong> en ARGYM
            termina ${escapeHtml(endDateText)}. Después de esa fecha se realizará el primer cobro
            automático a tu método de pago registrado.
          </p>
          <p style="margin:0;color:#374151">
            Si necesitas actualizar tu método de pago o tienes alguna pregunta, contáctanos respondiendo
            este correo.
          </p>
        </div>
      `,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return jsonResponse({ ok: false, message: `Error al enviar: ${msg}` })
  }

  return jsonResponse({ ok: true, sent: to_emails.length })
})
