import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CoachShell } from '@/components/coach/coach-shell'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, approval_status, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.approval_status !== 'approved') redirect('/pending-approval')

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const role = (userRole as any)?.roles?.name as string | undefined
  if (role !== 'coach') redirect('/pending-approval')

  const { data: tenant } = profile.tenant_id
    ? await supabase.from('tenants').select('name, logo_url').eq('id', profile.tenant_id).single()
    : { data: null }

  return (
    <CoachShell
      userName={profile?.full_name ?? user.email ?? ''}
      userEmail={user.email ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
      userId={user.id}
      currentTenantName={tenant?.name}
      currentTenantLogoUrl={tenant?.logo_url}
    >
      {children}
    </CoachShell>
  )
}
