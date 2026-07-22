'use server'

import { createClient } from '@/lib/supabase/server'

export async function sendContactMessageAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()
  const message = (formData.get('message') as string)?.trim()

  if (!name || !email || !message) {
    return { error: 'Nombre, correo y mensaje son requeridos.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.functions.invoke('contact-us', {
    body: { name, email, phone: phone || undefined, message },
  })

  if (error) return { error: 'No se pudo enviar tu mensaje. Intenta de nuevo en unos minutos.' }
  if (data && data.ok === false) return { error: data.message ?? 'No se pudo enviar tu mensaje.' }

  return { success: true }
}
