import { createTransport } from 'npm:nodemailer'

// Public landing-page "contact us" form. Unlike smtp_configs (per-tenant,
// used to email a gym's own clients), this sends to the platform inbox
// (argymsaas@gmail.com) using a dedicated Gmail account + app password —
// there is no tenant context here, the visitor hasn't signed up yet.
// Runs as an edge function (not a Next.js route) for the same reason
// test-smtp does: Render's free web-service tier blocks outbound SMTP ports.

interface Payload {
  name: string
  email: string
  phone?: string
  message: string
}

const TO_EMAIL = 'argymsaas@gmail.com'
const MAX_LEN = 4000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ ok: false, message: 'Invalid JSON' }, 400)
  }

  const name = payload.name?.trim()
  const email = payload.email?.trim()
  const phone = payload.phone?.trim() || null
  const message = payload.message?.trim()

  if (!name || !email || !message) {
    return jsonResponse({ ok: false, message: 'Nombre, correo y mensaje son requeridos.' }, 400)
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ ok: false, message: 'Correo inválido.' }, 400)
  }
  if (name.length > 200 || message.length > MAX_LEN || (phone?.length ?? 0) > 50) {
    return jsonResponse({ ok: false, message: 'Uno de los campos excede el largo permitido.' }, 400)
  }

  const gmailUser = Deno.env.get('CONTACT_GMAIL_USER')
  const gmailPass = Deno.env.get('CONTACT_GMAIL_APP_PASSWORD')
  if (!gmailUser || !gmailPass) {
    return jsonResponse({ ok: false, message: 'El formulario de contacto no está configurado.' }, 500)
  }

  const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  })

  try {
    await transporter.sendMail({
      from: `"ARGYM — Sitio web" <${gmailUser}>`,
      to: TO_EMAIL,
      replyTo: `"${name}" <${email}>`,
      subject: `Nuevo contacto desde argym.app: ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px">Nuevo mensaje de contacto</h2>
          <p style="margin:0 0 6px;color:#374151"><strong>Nombre:</strong> ${escapeHtml(name)}</p>
          <p style="margin:0 0 6px;color:#374151"><strong>Correo:</strong> ${escapeHtml(email)}</p>
          ${phone ? `<p style="margin:0 0 6px;color:#374151"><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>` : ''}
          <p style="margin:16px 0 4px;color:#374151"><strong>Mensaje:</strong></p>
          <p style="margin:0;color:#374151;white-space:pre-wrap">${escapeHtml(message)}</p>
        </div>
      `,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return jsonResponse({ ok: false, message: `Error al enviar: ${msg}` })
  }

  return jsonResponse({ ok: true })
})
