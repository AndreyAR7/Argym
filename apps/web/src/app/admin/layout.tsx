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
  if (!profile || profile.approval_status !== 'approved') redirect('/pending-approval')
  if (role !== 'admin') redirect('/pending-approval')

  let tenants: { id: string; name: string }[] | undefined
  let homeTenantId: string | null = null

  if (isPlatformAdmin) {
    const db = adminClient()
    const [tenantsResult, platformAdminResult] = await Promise.all([
      db.from('tenants').select('id, name').eq('is_active', true).order('name'),
      db.from('platform_admins').select('home_tenant_id').eq('user_id', user.id).single(),
    ])
    tenants = tenantsResult.data ?? []
    homeTenantId = platformAdminResult.data?.home_tenant_id ?? null
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
      homeTenantId={homeTenantId}
    >
      {children}
    </AdminShell>
  )
}
