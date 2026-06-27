'use server'

import { getSessionData } from '@/lib/auth/session'
import { createTransport } from 'nodemailer'

export async function testSmtpAction(toEmail: string): Promise<{ ok: boolean; message: string }> {
  const session = await getSessionData()
  if (!session) return { ok: false, message: 'No autenticado' }

  const { supabase } = session

  const { data: config, error } = await supabase
    .from('smtp_configs')
    .select('host, port, username, password, from_email, from_name, use_tls')
    .maybeSingle()

  if (error) return { ok: false, message: `Error al leer configuración: ${error.message}` }
  if (!config) return { ok: false, message: 'No hay configuración SMTP guardada. Completa y guarda la configuración primero.' }
  if (!config.host || !config.username || !config.password) {
    return { ok: false, message: 'La configuración SMTP está incompleta (faltan host, usuario o contraseña).' }
  }

  const port = Number(config.port)
  const transporter = createTransport({
    host:       config.host,
    port,
    secure:     port === 465,
    requireTLS: port === 587,
    auth: { user: config.username, pass: config.password },
    tls: { rejectUnauthorized: false },
  })

  try {
    await transporter.verify()
  } catch (err: any) {
    const msg  = err.message ?? String(err)
    const code = err.responseCode ?? err.code ?? ''
    if (
      code === 535 || String(code) === '535' ||
      msg.includes('535') || msg.includes('Invalid login') ||
      msg.includes('Username and Password') || msg.includes('BadCredentials')
    ) {
      const isGmail = config.host.includes('gmail')
      const hint = isGmail
        ? 'Para Gmail: 1) Activa la verificación en 2 pasos en la cuenta, 2) genera una Contraseña de Aplicación en Seguridad → Contraseñas de aplicaciones, 3) pega los 16 caracteres sin espacios.'
        : 'Verifica el usuario y contraseña. Si usas Gmail, necesitas una Contraseña de Aplicación.'
      return { ok: false, message: `Autenticación rechazada (535). ${hint}` }
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
      return { ok: false, message: `No se puede conectar a ${config.host}:${port}. Verifica host y puerto.` }
    }
    return { ok: false, message: `Error SMTP: [${code}] ${msg}` }
  }

  try {
    await transporter.sendMail({
      from:    `"${config.from_name || 'ARGYM'}" <${config.from_email}>`,
      to:      toEmail,
      subject: '✅ Prueba de conexión SMTP — ARGYM',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="margin:0 0 8px;color:#6C63FF;font-size:20px">✅ Conexión SMTP exitosa</h2>
          <p style="margin:0 0 20px;color:#374151;font-size:15px">
            Tu servidor SMTP está correctamente configurado en <strong>ARGYM</strong>.
            Los emails automáticos de reglas y notificaciones se enviarán desde esta cuenta.
          </p>
          <div style="background:#f9fafb;border-radius:8px;padding:14px 16px;font-size:13px;color:#6b7280">
            <strong style="color:#374151">Configuración activa:</strong><br>
            Servidor: <code>${config.host}:${config.port}</code><br>
            Remitente: ${config.from_name} &lt;${config.from_email}&gt;<br>
            TLS: ${config.use_tls ? 'Sí' : 'No'}
          </div>
          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">
            Email generado automáticamente · ARGYM Platform
          </p>
        </div>
      `,
    })
  } catch (err: any) {
    return { ok: false, message: `Conexión OK pero falló el envío: ${err.message}` }
  }

  return { ok: true, message: `Email de prueba enviado a ${toEmail}` }
}
