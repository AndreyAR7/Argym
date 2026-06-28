import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileForm } from '@/components/admin/profile-form'

export const metadata = { title: 'Mi Perfil' }

export default async function ClientProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, avatar_url, created_at, gender')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <PageHeader
        title="Mi Perfil"
        subtitle="Información de tu cuenta"
      />
      <div className="mt-8">
        <ProfileForm
          userId={user.id}
          email={user.email ?? ''}
          fullName={profile?.full_name ?? ''}
          phone={profile?.phone ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          createdAt={profile?.created_at ?? null}
          gender={profile?.gender ?? null}
        />
      </div>
    </div>
  )
}
