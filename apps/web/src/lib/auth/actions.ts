'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function getAppBaseUrl(): string {
  // NEXT_PUBLIC_APP_URL is the authoritative source in production.
  // Header-based detection is unreliable on Render (internal binding is localhost:10000).
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  return 'http://localhost:3000'
}

export async function loginWithGoogleAction() {
  const baseUrl = getAppBaseUrl()

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    // After exchanging the code, /auth/callback redirects here.
    // select-branch checks if the user already has a branch and skips if so.
    options: { redirectTo: `${baseUrl}/auth/callback?next=/select-branch` },
  })

  if (error || !data.url) redirect('/login?error=oauth_error')
  redirect(data.url)
}

export async function saveBranchAction(
  branchId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('set_own_branch', { p_branch_id: branchId })
  if (error) return { error: error.message }

  // Redirect based on current approval status
  const { data: profile } = await supabase
    .from('profiles')
    .select('approval_status')
    .eq('id', user.id)
    .single()

  if (profile?.approval_status === 'approved') redirect('/')
  redirect('/pending-approval')
}

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

export async function forgotPasswordAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'El correo es requerido' }

  const baseUrl = getAppBaseUrl()
  const redirectTo = `${baseUrl}/auth/callback?next=/reset-password`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) {
    console.error('[forgotPassword]', error.message)
    // Rate-limit is safe to reveal (doesn't leak whether the email is registered)
    if (error.status === 429) {
      return { error: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.' }
    }
  }
  // For all other outcomes return success to avoid leaking which emails exist
  return { success: true }
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'No autenticado' }

  // Verify current password
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) return { error: 'La contraseña actual es incorrecta' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}

export async function registerAction(_prevState: { error: string } | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const branchId = (formData.get('branch_id') as string) || null

  if (!email || !password || !fullName) {
    return { error: 'Todos los campos son requeridos.' }
  }

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const supabase = await createClient()

  let tenantId: string
  let resolvedBranchId: string | null = null

  if (branchId) {
    // User selected a specific branch — derive the tenant from it.
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, tenant_id')
      .eq('id', branchId)
      .eq('is_active', true)
      .single()

    if (branchError || !branch) {
      return { error: 'La sede seleccionada no está disponible. Contacta al administrador.' }
    }
    tenantId = branch.tenant_id
    resolvedBranchId = branch.id
  } else {
    // Fallback: no branches configured yet — find the single active tenant.
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
    tenantId = tenant.id
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        tenant_id: tenantId,
        ...(resolvedBranchId ? { branch_id: resolvedBranchId } : {}),
        requested_role: 'client',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/pending-approval')
}
