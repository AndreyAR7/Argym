import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CoachShell } from '@/components/coach/coach-shell'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, approval_status, tenant_id, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.approval_status !== 'approved') redirect('/pending-approval')
  if (profile.is_active === false) redirect('/account-suspended')

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const role = (userRole as any)?.roles?.name as string | undefined
  if (role !== 'coach') redirect('/pending-approval')

  const [{ data: tenant }, { data: hasPassword }] = await Promise.all([
    profile.tenant_id
      ? supabase.from('tenants').select('name, logo_url').eq('id', profile.tenant_id).single()
      : Promise.resolve({ data: null }),
    supabase.rpc('user_has_password'),
  ])

  return (
    <CoachShell
      userName={profile?.full_name ?? user.email ?? ''}
      userEmail={user.email ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
      userId={user.id}
      currentTenantName={tenant?.name}
      currentTenantLogoUrl={tenant?.logo_url}
      hasPassword={!!hasPassword}
    >
      {children}
    </CoachShell>
  )
}
