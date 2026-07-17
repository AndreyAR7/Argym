import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { SelectGymList } from './_components/select-gym-list'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export const metadata = { title: 'Elegí un gimnasio — ARGYM HQ' }

export default async function SelectGymPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
  if (!isPlatformAdmin) redirect('/')

  const db = adminClient()
  const { data: gyms } = await db
    .from('tenants')
    .select('id, name, slug, logo_url')
    .eq('is_active', true)
    .order('name')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          ¿A qué gimnasio vas?
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Administrás más de un gimnasio — elegí con cuál trabajar ahora.
        </p>
      </div>

      <SelectGymList gyms={gyms ?? []} />
    </div>
  )
}
