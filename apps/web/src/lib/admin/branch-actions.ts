'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, tenantId: null, error: 'No autenticado' as const }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (error || !profile) return { supabase, tenantId: null, error: 'No se pudo obtener el perfil' as const }
  return { supabase, tenantId: profile.tenant_id as string, error: null }
}

export async function createBranchAction(data: {
  name: string
  address: string | null
  phone: string | null
  email: string | null
}) {
  const { supabase, tenantId, error: authError } = await getAdminContext()
  if (authError || !tenantId) return { error: authError ?? 'Sin tenant' }

  const { error } = await supabase.from('branches').insert({
    tenant_id: tenantId,
    name: data.name.trim(),
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/branches')
  return { success: true }
}

export async function updateBranchAction(id: string, data: {
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}) {
  const { supabase, error: authError } = await getAdminContext()
  if (authError) return { error: authError }

  const { error } = await supabase
    .from('branches')
    .update({
      name: data.name.trim(),
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      is_active: data.is_active,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/branches')
  return { success: true }
}

export async function deleteBranchAction(id: string) {
  const { supabase, error: authError } = await getAdminContext()
  if (authError) return { error: authError }

  // Unlink profiles before deleting to avoid constraint errors
  await supabase.from('profiles').update({ branch_id: null }).eq('branch_id', id)

  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/branches')
  return { success: true }
}

export async function assignProfileBranchAction(profileId: string, branchId: string | null) {
  const { supabase, error: authError } = await getAdminContext()
  if (authError) return { error: authError }

  const { error } = await supabase
    .from('profiles')
    .update({ branch_id: branchId })
    .eq('id', profileId)

  if (error) return { error: error.message }
  revalidatePath('/admin/branches')
  revalidatePath('/admin/clients')
  return { success: true }
}
