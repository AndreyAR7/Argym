import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth/session'
import { SuperAdminShell } from './super-admin-shell'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionData()
  if (!session) redirect('/login')

  const { user, profile, role } = session

  // Gate: must have admin role. In production, add a super_admin role or
  // check against an env-var allowlist of user IDs for tighter access control.
  if (role !== 'admin') redirect('/pending-approval')

  return (
    <SuperAdminShell
      userName={profile?.full_name ?? user.email ?? ''}
      userEmail={user.email ?? ''}
    >
      {children}
    </SuperAdminShell>
  )
}
