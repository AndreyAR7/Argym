import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSessionData } from '@/lib/auth/session'
import { AdminShell } from '@/components/admin/admin-shell'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionData()
  if (!session) redirect('/login')

  const { user, profile, role, isPlatformAdmin, tenantId } = session

  // Platform admins are a trusted identity independent of any single
  // tenant's approval workflow — never gate them on approval_status/role.
  if (!isPlatformAdmin) {
    if (!profile || profile.approval_status !== 'approved') redirect('/pending-approval')
    if (role !== 'admin') redirect('/pending-approval')
  }

  let tenants: { id: string; name: string }[] | undefined
  let homeTenantId: string | null = null
  let currentTenantName: string | undefined
  let currentTenantLogoUrl: string | null | undefined

  const db = adminClient()

  if (isPlatformAdmin) {
    const [tenantsResult, platformAdminResult] = await Promise.all([
      db.from('tenants').select('id, name, logo_url').eq('is_active', true).order('name'),
      db.from('platform_admins').select('home_tenant_id').eq('user_id', user.id).single(),
    ])
    const allTenants = tenantsResult.data ?? []
    tenants = allTenants.map(({ id, name }) => ({ id, name }))
    homeTenantId = platformAdminResult.data?.home_tenant_id ?? null
    const current = allTenants.find((t) => t.id === tenantId)
    currentTenantName = current?.name
    currentTenantLogoUrl = current?.logo_url
  } else if (tenantId) {
    const { data: tenant } = await db.from('tenants').select('name, logo_url').eq('id', tenantId).single()
    currentTenantName = tenant?.name
    currentTenantLogoUrl = tenant?.logo_url
  }

  return (
    <AdminShell
      userName={profile?.full_name ?? user.email ?? ''}
      userEmail={user.email ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
      userId={user.id}
      isPlatformAdmin={isPlatformAdmin}
      tenants={tenants}
      currentTenantId={tenantId}
      currentTenantName={currentTenantName}
      currentTenantLogoUrl={currentTenantLogoUrl}
      homeTenantId={homeTenantId}
    >
      {children}
    </AdminShell>
  )
}
