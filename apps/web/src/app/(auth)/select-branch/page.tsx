import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SelectBranchForm } from './_components/select-branch-form'

export const metadata = { title: 'Elegí tu sede' }

export default async function SelectBranchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // If user already has a branch, send them where they belong
  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id, approval_status')
    .eq('id', user.id)
    .single()

  if (profile?.branch_id) {
    redirect(profile.approval_status === 'approved' ? '/' : '/pending-approval')
  }

  // Approved users with no branch (data migration gap) — skip branch selection
  // and send them directly to their dashboard. The root page will route by role.
  if (profile?.approval_status === 'approved') {
    redirect('/')
  }

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, address')
    .eq('is_active', true)
    .order('name')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          ¿A qué sede vas?
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Elegí tu gimnasio para completar tu solicitud de acceso.
        </p>
      </div>

      <SelectBranchForm branches={branches ?? []} />

      <p className="mt-6 text-xs text-center text-[var(--color-muted-foreground)]">
        Tu cuenta será revisada por un administrador antes de tener acceso.
      </p>
    </div>
  )
}
