'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getCallerTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, tenantId: null, userId: null }
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile) return { error: 'Perfil no encontrado' as const, tenantId: null, userId: null }
  return { error: null, tenantId: profile.tenant_id, userId: user.id }
}

// Invites a person by email — they skip the normal pending-approval flow
// entirely if they sign up (Google or email/password) using this exact
// email; see handle_new_user() in migration 20240101000197.
export async function sendClientInvitationAction(data: {
  email: string
  full_name: string
}): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient()
  const { error: authErr, tenantId, userId } = await getCallerTenantId(supabase)
  if (authErr) return { error: authErr }

  const { data: allowed } = await supabase.rpc('has_permission', { permission_code: 'clients.manage' })
  if (!allowed) return { error: 'No tienes permiso para invitar clientes.' }

  const email = data.email.trim().toLowerCase()
  const fullName = data.full_name.trim()
  if (!email || !fullName) return { error: 'Correo y nombre son requeridos.' }

  // Reuse an existing pending invite for this email instead of erroring on
  // the unique index — re-sending should just refresh it.
  const { data: existing } = await supabase
    .from('client_invitations')
    .select('id')
    .eq('tenant_id', tenantId!)
    .eq('status', 'pending')
    .ilike('email', email)
    .maybeSingle()

  let invitationId: string
  if (existing) {
    const { error } = await supabase
      .from('client_invitations')
      .update({ full_name: fullName, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 14 * 86_400_000).toISOString() })
      .eq('id', existing.id)
    if (error) return { error: error.message }
    invitationId = existing.id
  } else {
    const { data: inserted, error } = await supabase
      .from('client_invitations')
      .insert({ tenant_id: tenantId!, email, full_name: fullName, invited_by: userId! })
      .select('id')
      .single()
    if (error) return { error: error.message }
    invitationId = inserted.id
  }

  const { data: result, error: fnError } = await supabase.functions.invoke('send-communication', {
    body: { event_type: 'client.invitation', tenant_id: tenantId, invitation_id: invitationId },
  })
  if (fnError) return { error: `Invitación creada, pero el correo falló: ${fnError.message}` }
  if (result?.status === 'failed') return { error: 'Invitación creada, pero el envío del correo falló. Intenta reenviar.' }

  revalidatePath('/admin/clients')
  return { success: true }
}
