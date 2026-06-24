'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(_prevState: { error: string } | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Correo y contraseña son requeridos.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.status === 429) {
      return { error: 'Demasiados intentos. Intenta en unos minutos.' }
    }
    return { error: 'Correo o contraseña incorrectos.' }
  }

  redirect('/')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function registerAction(_prevState: { error: string } | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  if (!email || !password || !fullName) {
    return { error: 'Todos los campos son requeridos.' }
  }

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const supabase = await createClient()

  // Discover the active tenant so the DB trigger can create the profile row.
  // Requires the "tenants_public_read_active" RLS policy (migration 000043).
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!tenant) {
    return { error: 'No se encontró un gimnasio activo. Contacta al administrador.' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        tenant_id: tenant.id,
        requested_role: 'client',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/pending-approval')
}
