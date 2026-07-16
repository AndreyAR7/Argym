import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth/session'
import { SuperAdminShell } from './super-admin-shell'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionData()
  if (!session) redirect('/login')

  const { user, profile, isPlatformAdmin } = session

  if (!isPlatformAdmin) redirect('/')

  return (
    <SuperAdminShell
      userName={profile?.full_name ?? user.email ?? ''}
      userEmail={user.email ?? ''}
    >
      {children}
    </SuperAdminShell>
  )
}
