import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { ArrowLeft } from 'lucide-react'
import { NewTenantForm } from './new-tenant-form'

export const metadata = { title: 'Nuevo gimnasio — ARGYM HQ' }

export default async function NewTenantPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/')

  return (
    <div className="p-6 md:p-8 max-w-lg">
      <Link
        href="/super-admin/tenants"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-80"
        style={{ color: '#737373' }}
      >
        <ArrowLeft size={14} />
        Volver a gimnasios
      </Link>

      <h1 className="text-xl font-semibold mb-6" style={{ color: '#f0f0f0' }}>
        Nuevo gimnasio
      </h1>

      <NewTenantForm />
    </div>
  )
}
