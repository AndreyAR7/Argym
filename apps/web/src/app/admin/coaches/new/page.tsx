import { getSessionData } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { NewCoachForm } from '@/components/admin/new-coach-form'

export const metadata = { title: 'Nuevo coach' }

export default async function NewCoachPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')

  return (
    <div className="p-4 md:p-8 max-w-lg">
      <PageHeader
        title="Nuevo coach"
        subtitle="Crea una cuenta de coach directamente activa"
      />
      <NewCoachForm />
    </div>
  )
}
