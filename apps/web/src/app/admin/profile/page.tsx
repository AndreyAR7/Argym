import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileForm } from '@/components/admin/profile-form'

export const metadata = { title: 'Mi perfil' }

export default async function ProfilePage() {
  const session = await getSessionData()
  if (!session) redirect('/login')

  const { supabase, user } = session

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, avatar_url, approval_status, created_at')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <PageHeader
        title="Mi perfil"
        subtitle="Información de tu cuenta de administrador"
      />
      <div className="mt-8">
        <ProfileForm
          userId={user.id}
          email={user.email ?? ''}
          fullName={profile?.full_name ?? ''}
          phone={profile?.phone ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          createdAt={profile?.created_at ?? null}
        />
      </div>
    </div>
  )
}
