'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Approvals ──────────────────────────────────────────────────

export async function approveUserAction(userId: string, roleName: 'client' | 'coach' | 'admin') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('approve_user', {
    p_user_id: userId,
    p_role_name: roleName,
    p_admin_id: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/approvals')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function rejectUserAction(userId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.rpc('reject_user', {
    p_user_id: userId,
    p_reason: reason,
    p_admin_id: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/approvals')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

// ── Create coach (via Edge Function) ──────────────────────────

export async function createClientAction(data: {
  full_name: string
  email: string
  password: string
  phone: string | null
  date_of_birth: string | null
}): Promise<{ success?: true; id?: string; error?: string }> {
  const supabase = await createClient()

  const { data: result, error } = await supabase.functions.invoke('create-user', {
    body: {
      role:           'client',
      full_name:      data.full_name.trim(),
      email:          data.email.trim().toLowerCase(),
      password:       data.password,
      phone:          data.phone?.trim() || undefined,
      date_of_birth:  data.date_of_birth || undefined,
    },
  })

  if (error) return { error: error.message }
  if (result?.error) return { error: result.error }

  revalidatePath('/admin/clients')
  return { success: true, id: result?.id }
}

export async function createCoachAction(data: {
  full_name: string
  email: string
  password: string
  phone: string | null
}): Promise<{ success?: true; id?: string; error?: string }> {
  const supabase = await createClient()

  const { data: result, error } = await supabase.functions.invoke('create-user', {
    body: {
      role:      'coach',
      full_name: data.full_name.trim(),
      email:     data.email.trim().toLowerCase(),
      password:  data.password,
      phone:     data.phone?.trim() || undefined,
    },
  })

  if (error) return { error: error.message }
  if (result?.error) return { error: result.error }

  revalidatePath('/admin/coaches')
  return { success: true, id: result?.id }
}

// ── Client / Coach management ──────────────────────────────────

export async function toggleProfileActiveAction(targetUserId: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', targetUserId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateProfileAction(
  targetUserId: string,
  data: {
    full_name: string
    phone: string | null
    client_level: 'beginner' | 'intermediate' | 'advanced' | null
  },
) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('update_profile_by_staff', {
    p_target_user_id: targetUserId,
    p_full_name: data.full_name,
    p_phone: data.phone,
    p_date_of_birth: null,
    p_client_level: data.client_level,
    p_clear_client_level: data.client_level === null,
    p_is_active: null,
  })

  if (error) {
    // Fallback: direct update if RPC doesn't exist
    const { error: fallbackError } = await supabase
      .from('profiles')
      .update({ full_name: data.full_name, phone: data.phone, client_level: data.client_level })
      .eq('id', targetUserId)
    if (fallbackError) return { error: fallbackError.message }
  }

  revalidatePath('/admin/clients')
  revalidatePath('/admin/coaches')
  return { success: true }
}

export async function assignPlanAction(userId: string, tenantId: string, planId: string, price: number) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('assign_plan', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_plan_id: planId,
    p_price: price,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/clients')
  return { success: true }
}

// ── Plans ──────────────────────────────────────────────────────

export async function createPlanAction(data: {
  name: string
  description: string | null
  price: number
  currency: string
  billing_cycle: 'monthly' | 'yearly' | 'one_time'
  features: string[]
  expiry_date?: string | null
  plan_tier?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const features = data.features
    .filter((f: string) => f.trim())
    .map((name: string) => ({ name, value: 'true' }))

  const { error } = await supabase
    .from('plans')
    .insert({
      tenant_id: profile!.tenant_id,
      name: data.name,
      description: data.description || null,
      price: data.price,
      currency: data.currency,
      billing_cycle: data.billing_cycle,
      features,
      expiry_date: data.expiry_date || null,
      plan_tier: data.plan_tier || null,
    })

  if (error) return { error: error.message }
  revalidatePath('/admin/plans')
  return { success: true }
}

export async function updatePlanAction(planId: string, data: {
  name: string
  description: string | null
  price: number
  currency: string
  billing_cycle: 'monthly' | 'yearly' | 'one_time'
  features: string[]
  expiry_date?: string | null
  plan_tier?: string | null
}) {
  const supabase = await createClient()

  const features = data.features
    .filter((f: string) => f.trim())
    .map((name: string) => ({ name, value: 'true' }))

  const { error } = await supabase
    .from('plans')
    .update({
      name: data.name,
      description: data.description || null,
      price: data.price,
      currency: data.currency,
      billing_cycle: data.billing_cycle,
      features,
      expiry_date: data.expiry_date || null,
      plan_tier: data.plan_tier || null,
    })
    .eq('id', planId)

  if (error) return { error: error.message }
  revalidatePath('/admin/plans')
  return { success: true }
}

export async function togglePlanActiveAction(planId: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('plans')
    .update({ is_active: isActive })
    .eq('id', planId)

  if (error) return { error: error.message }
  revalidatePath('/admin/plans')
  revalidatePath('/admin/clients')
  return { success: true }
}

export async function deletePlanAction(planId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Perfil no encontrado' }

  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)
    .eq('tenant_id', profile.tenant_id)

  if (error) return { error: error.message }
  revalidatePath('/admin/plans')
  revalidatePath('/admin/clients')
  return { success: true }
}

// ── Billing / Invoices ─────────────────────────────────────────

export async function markInvoicePaidAction(invoiceId: string, notes: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('mark_invoice_paid', {
    p_invoice_id: invoiceId,
    p_notes: notes || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/billing')
  return { success: true }
}

export async function cancelSubscriptionAction(subscriptionId: string, reason: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('cancel_subscription', {
    p_subscription_id: subscriptionId,
    p_reason: reason || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/billing')
  revalidatePath('/admin/clients')
  return { success: true }
}

// ── Branches ───────────────────────────────────────────────────

export async function createBranchAction(data: {
  name: string
  address: string | null
  phone: string | null
  email: string | null
}): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Perfil no encontrado' }

  const { error } = await supabase
    .from('branches')
    .insert({
      tenant_id: profile.tenant_id,
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
    })

  if (error) return { error: error.message }
  revalidatePath('/admin/branches')
  return { success: true }
}

export async function updateBranchAction(
  id: string,
  data: {
    name: string
    address: string | null
    phone: string | null
    email: string | null
  },
): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('branches')
    .update({
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/branches')
  return { success: true }
}

export async function toggleBranchActiveAction(
  id: string,
  isActive: boolean,
): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('branches')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/branches')
  return { success: true }
}

export async function assignUserToBranchAction(
  userId: string,
  branchId: string | null,
): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('assign_user_to_branch', {
    p_user_id: userId,
    p_branch_id: branchId,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/clients')
  revalidatePath('/admin/coaches')
  return { success: true }
}
