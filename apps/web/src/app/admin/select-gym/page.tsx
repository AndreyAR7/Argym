import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getSessionData } from '@/lib/auth/session'
import { SelectGymPicker } from './select-gym-picker'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export const metadata = { title: 'Elegí un gimnasio — ARGYM HQ' }

export default async function SelectGymPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')
  if (!session.isPlatformAdmin) redirect('/admin/dashboard')

  const db = adminClient()
  const { data: gyms } = await db
    .from('tenants')
    .select('id, name, slug, logo_url')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-6 md:p-8 max-w-lg mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-foreground)]">
          ¿A qué gimnasio querés entrar?
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Administrás más de un gimnasio — elegí con cuál trabajar ahora. Podés cambiar en cualquier momento desde el sidebar.
        </p>
      </div>

      <SelectGymPicker gyms={gyms ?? []} />
    </div>
  )
}
