import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('approval_status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.approval_status === 'pending') {
    redirect('/pending-approval')
  }

  if (profile.approval_status === 'rejected') {
    redirect('/pending-approval')
  }

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const role = (userRole as any)?.roles?.name as string | undefined

  if (role === 'admin') redirect('/admin/dashboard')
  if (role === 'coach') redirect('/coach')
  redirect('/client/inicio')
}
