import { getSessionData } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { NewClientForm } from '@/components/admin/new-client-form'

export const metadata = { title: 'Nuevo cliente' }

export default async function NewClientPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')

  return (
    <div className="p-4 md:p-8 max-w-lg">
      <PageHeader
        title="Nuevo cliente"
        subtitle="Crea una cuenta de cliente directamente activa"
      />
      <NewClientForm />
    </div>
  )
}
