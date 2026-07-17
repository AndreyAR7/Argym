import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SelectBranchForm } from './_components/select-branch-form'
import { GymPicker } from '../_components/gym-picker'

export const metadata = { title: 'Elegí tu sede' }

export default async function SelectBranchPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const { slug } = await searchParams
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

  // No gym chosen yet — pick the gym first, then re-enter this page scoped to it.
  if (!slug) {
    const { data: gyms } = await supabase
      .from('tenants')
      .select('slug, name, logo_url')
      .eq('is_active', true)
      .order('name')

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            ¿A qué gimnasio vas?
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
            Elegí el gimnasio para continuar con tu solicitud de acceso.
          </p>
        </div>

        <GymPicker gyms={gyms ?? []} mode="select-branch" />
      </div>
    )
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, address')
    .eq('is_active', true)
    .eq('tenant_id', tenant?.id ?? '')
    .order('name')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          ¿A qué sede vas?
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Elegí tu sede para completar tu solicitud de acceso.
        </p>
      </div>

      <SelectBranchForm branches={branches ?? []} />

      <p className="mt-6 text-xs text-center text-[var(--color-muted-foreground)]">
        Tu cuenta será revisada por un administrador antes de tener acceso.
      </p>
    </div>
  )
}
