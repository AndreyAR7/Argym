'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getSessionData } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function assertSuperAdmin() {
  const session = await getSessionData()
  if (!session || !session.isPlatformAdmin) redirect('/')
  return adminClient()
}

// ── Platform subscription management ──────────────────────────────────────────

export async function upsertPlatformSubscriptionAction(data: {
  tenantId: string
  planId: string
  status: string
  billingCycle: string
  periodStart: string
  periodEnd: string
}) {
  const db = await assertSuperAdmin()

  const { error } = await db.from('tenant_subscriptions').upsert(
    {
      tenant_id:            data.tenantId,
      plan_id:              data.planId,
      status:               data.status,
      billing_cycle:        data.billingCycle,
      current_period_start: data.periodStart,
      current_period_end:   data.periodEnd,
      updated_at:           new Date().toISOString(),
    },
    { onConflict: 'tenant_id' },
  )

  if (error) return { error: error.message }

  // Sync tenant.is_active based on status
  const isActive = data.status === 'active' || data.status === 'trialing'
  await db.from('tenants').update({ is_active: isActive }).eq('id', data.tenantId)

  // Sync tenant_modules from the plan's module list, so module gating never
  // drifts from whichever plan the tenant is currently assigned.
  const { data: plan } = await db
    .from('subscription_plans')
    .select('modules')
    .eq('id', data.planId)
    .single()

  await db.from('tenant_modules').delete().eq('tenant_id', data.tenantId)
  const modules = (plan?.modules as string[] | undefined) ?? []
  if (modules.length > 0) {
    await db.from('tenant_modules').insert(
      modules.map((module) => ({ tenant_id: data.tenantId, module, enabled: true })),
    )
  }

  revalidatePath(`/super-admin/tenants/${data.tenantId}`)
  return { success: true }
}

export async function suspendTenantPlatformAction(tenantId: string) {
  const db = await assertSuperAdmin()

  await Promise.all([
    db.from('tenants').update({ is_active: false }).eq('id', tenantId),
    db
      .from('tenant_subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId),
  ])

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/tenants')
  return { success: true }
}

export async function reactivateTenantPlatformAction(tenantId: string) {
  const db = await assertSuperAdmin()

  await Promise.all([
    db.from('tenants').update({ is_active: true }).eq('id', tenantId),
    db
      .from('tenant_subscriptions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId),
  ])

  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/tenants')
  return { success: true }
}

export async function toggleTenantActiveAction(tenantId: string, isActive: boolean) {
  const db = await assertSuperAdmin()
  const { error } = await db
    .from('tenants')
    .update({ is_active: isActive })
    .eq('id', tenantId)

  if (error) return { error: error.message }
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin/tenants')
  return { success: true }
}

export async function createTenantAction(data: {
  name: string
  slug: string
  timezone: string
  currency: string
  locale: string
}) {
  const db = await assertSuperAdmin()
  const { data: tenant, error } = await db
    .from('tenants')
    .insert({
      name:      data.name.trim(),
      slug:      data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      timezone:  data.timezone,
      currency:  data.currency,
      locale:    data.locale,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Auto-seed default branch, email templates, and communication rules
  const seedResult = await db.rpc('seed_tenant_defaults', { p_tenant_id: tenant.id })
  if (seedResult.error) {
    console.error('[createTenant] seed_tenant_defaults failed:', seedResult.error.message)
  }

  revalidatePath('/super-admin/tenants')
  return { success: true, tenantId: tenant.id }
}
