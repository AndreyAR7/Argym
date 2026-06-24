import { PageHeader } from '@/components/shared/page-header'
import { NotificationForm } from '@/components/admin/notification-form'

export const metadata = { title: 'Notificaciones' }

export default function NotificationsPage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <PageHeader
        title="Notificaciones push"
        subtitle="Envía mensajes a tus clientes y coaches"
      />

      <div className="mt-8">
        <NotificationForm />
      </div>
    </div>
  )
}
