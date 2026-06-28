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

export async function updateClientProfileAction(
  clientId: string,
  data: { full_name: string; phone: string | null; client_level: string | null },
) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { success: false, error: authErr }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      phone: data.phone,
      client_level: data.client_level,
    })
    .eq('id', clientId)
    .eq('tenant_id', tenantId!)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/clients')
  return { success: true }
}

export async function toggleClientActiveAction(clientId: string, isActive: boolean) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { success: false, error: authErr }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', clientId)
    .eq('tenant_id', tenantId!)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/clients')
  return { success: true }
}

export async function approveClientAction(clientId: string) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { success: false, error: authErr }

  const { error } = await supabase
    .from('profiles')
    .update({ approval_status: 'approved' })
    .eq('id', clientId)
    .eq('tenant_id', tenantId!)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/clients')
  revalidatePath('/admin/approvals')
  return { success: true }
}

export async function rejectClientAction(clientId: string, reason: string) {
  const supabase = await createClient()
  const { error: authErr, tenantId } = await getCallerTenantId(supabase)
  if (authErr) return { success: false, error: authErr }

  const { error } = await supabase
    .from('profiles')
    .update({ approval_status: 'rejected' })
    .eq('id', clientId)
    .eq('tenant_id', tenantId!)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/approvals')
  return { success: true }
}
