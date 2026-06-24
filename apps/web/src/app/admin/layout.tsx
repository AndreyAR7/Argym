import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth/session'
import { AdminShell } from '@/components/admin/admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionData()
  if (!session) redirect('/login')

  const { user, profile, role } = session
  if (!profile || profile.approval_status !== 'approved') redirect('/pending-approval')
  if (role !== 'admin') redirect('/')

  return (
    <AdminShell
      userName={profile?.full_name ?? user.email ?? ''}
      userEmail={user.email ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
    >
      {children}
    </AdminShell>
  )
}
