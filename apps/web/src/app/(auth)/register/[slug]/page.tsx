import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegisterForm } from '../_components/register-form'

export default async function RegisterSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ email?: string; full_name?: string }>
}) {
  const { slug } = await params
  const { email, full_name } = await searchParams
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!tenant) notFound()

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, address, tenants(name)')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .order('name')

  return (
    <RegisterForm
      slug={slug}
      defaultEmail={email}
      defaultFullName={full_name}
      branches={(branches ?? []).map((b) => ({
        ...b,
        tenants: Array.isArray(b.tenants) ? b.tenants[0] ?? null : (b.tenants as { name: string } | null),
      }))}
    />
  )
}
