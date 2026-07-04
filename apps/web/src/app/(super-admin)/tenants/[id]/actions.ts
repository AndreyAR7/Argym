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

export async function toggleTenantActiveAction(tenantId: string, isActive: boolean) {
  const session = await getSessionData()
  if (!session || session.role !== 'admin') redirect('/')

  const db = adminClient()
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
  const session = await getSessionData()
  if (!session || session.role !== 'admin') redirect('/')

  const db = adminClient()
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
  revalidatePath('/super-admin/tenants')
  return { success: true, tenantId: tenant.id }
}
