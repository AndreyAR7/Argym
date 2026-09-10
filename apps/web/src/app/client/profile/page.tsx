import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileForm } from '@/components/admin/profile-form'
import { CalendarSyncCard } from '@/components/shared/calendar-sync-card'

export const metadata = { title: 'Mi Perfil' }

export default async function ClientProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: hasPassword }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, phone, avatar_url, created_at, gender')
      .eq('id', user.id)
      .single(),
    supabase.rpc('user_has_password'),
  ])

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
          hasPassword={!!hasPassword}
        />
      </div>
      <div className="mt-6">
        <CalendarSyncCard />
      </div>
    </div>
  )
}
