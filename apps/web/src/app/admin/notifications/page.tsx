import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { NotificationForm } from '@/components/admin/notification-form'
import { Bell, Users, Dumbbell } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Notificaciones' }

const TARGET_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  all:    { label: 'Todos',    icon: <Bell size={12} /> },
  client: { label: 'Clientes', icon: <Users size={12} /> },
  coach:  { label: 'Coaches',  icon: <Dumbbell size={12} /> },
}

export default async function NotificationsPage() {
  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const { data: broadcasts } = await supabase
    .from('notification_broadcasts')
    .select('id, title, body, target_role, created_at, profiles!sent_by(full_name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <PageHeader
        title="Notificaciones push"
        subtitle="Envía mensajes a tus clientes y coaches"
      />

      <div className="mt-8">
        <NotificationForm />
      </div>

      {/* ── Historial ── */}
      <section className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Historial de envíos</h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            Últimas 30 notificaciones enviadas manualmente
          </p>
        </div>

        {!broadcasts || broadcasts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-2">
              <Bell size={16} className="text-[var(--color-border)]" />
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Aún no se han enviado notificaciones.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {broadcasts.map((b) => {
              const target = TARGET_LABELS[b.target_role] ?? TARGET_LABELS.all
              const sender = (b as any).profiles?.full_name ?? '—'
              return (
                <li key={b.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                      {b.title}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-1">
                      {b.body}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1">
                      Enviado por {sender}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]">
                      {target.icon}
                      {target.label}
                    </span>
                    <time className="text-[10px] text-[var(--color-muted-foreground)] tabular-nums">
                      {formatDate(b.created_at)}
                    </time>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
