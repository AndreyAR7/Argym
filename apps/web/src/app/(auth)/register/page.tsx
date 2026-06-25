import { createClient } from '@/lib/supabase/server'
import { RegisterForm } from './_components/register-form'

export default async function RegisterPage() {
  const supabase = await createClient()

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, address, tenants!inner(name)')
    .eq('is_active', true)
    .order('name')

  return (
    <RegisterForm
      branches={(branches ?? []).map((b) => ({
        ...b,
        tenants: Array.isArray(b.tenants) ? b.tenants[0] ?? null : (b.tenants as { name: string } | null),
      }))}
    />
  )
}
