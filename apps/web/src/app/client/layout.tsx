import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientSidebar } from '@/components/client/sidebar'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, approval_status')
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
  if (role !== 'client') redirect('/')

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      <ClientSidebar
        userName={profile?.full_name ?? user.email ?? ''}
        userEmail={user.email ?? ''}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
