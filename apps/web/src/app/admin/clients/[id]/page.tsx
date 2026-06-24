import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth/session'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { ClientEditForm } from '@/components/admin/client-edit-form'
import { SubscriptionHistory } from '@/components/admin/subscription-history'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Perfil de cliente' }

const NUTRITION_STATUS_LABELS: Record<string, string> = {
  published: 'Publicado',
  draft:     'Borrador',
  archived:  'Archivado',
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: clientId } = await params

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const [profileResult, subscriptionsResult, nutritionResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, phone, client_level, is_active, approval_status, created_at')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single(),

    supabase
      .from('user_subscriptions')
      .select('id, status, final_price, start_date, end_date, created_at, plans(name, currency, billing_cycle)')
      .eq('user_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('nutrition_assignments')
      .select('id, assigned_at, note, nutrition_plans(name, status)')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId),
  ])

  const profile = profileResult.data
  if (!profile) notFound()

  const subscriptions = (subscriptionsResult.data ?? []) as unknown as {
    id: string
    status: string
    final_price: number | null
    start_date: string
    end_date: string | null
    plans: { name: string; currency: string } | null
  }[]

  const nutritionAssignments = (nutritionResult.data ?? []) as unknown as {
    id: string
    assigned_at: string
    note: string | null
    nutrition_plans: { name: string; status: string } | null
  }[]

  const isActive = profile.is_active !== false

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Volver a clientes
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Avatar
          name={profile.full_name ?? '?'}
          src={profile.avatar_url}
          size="lg"
          className="w-14 h-14 text-base flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <PageHeader title={profile.full_name ?? '—'} subtitle={`Miembro desde ${formatDate(profile.created_at)}`}>
            <div className="flex items-center gap-2">
              <Badge value={isActive ? 'active' : 'inactive'} showDot />
              {profile.approval_status && (
                <Badge value={profile.approval_status} />
              )}
              {profile.client_level && (
                <Badge value={profile.client_level} />
              )}
            </div>
          </PageHeader>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — edit form */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-5">
            Información del cliente
          </h2>
          <ClientEditForm
            client={{
              id:           profile.id,
              full_name:    profile.full_name,
              phone:        profile.phone,
              client_level: profile.client_level,
              is_active:    isActive,
            }}
          />
        </div>

        {/* RIGHT — subscriptions + nutrition */}
        <div className="flex flex-col gap-6">
          {/* Subscriptions */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden overflow-x-auto">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Suscripciones
              </h2>
            </div>
            <SubscriptionHistory subscriptions={subscriptions} />
          </div>

          {/* Nutrition plans */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden overflow-x-auto">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Planes nutricionales
              </h2>
            </div>

            {nutritionAssignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Sin planes nutricionales asignados
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {nutritionAssignments.map((assignment) => {
                  const plan = assignment.nutrition_plans
                  return (
                    <li key={assignment.id} className="flex items-center justify-between gap-3 px-6 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                          {plan?.name ?? '—'}
                        </p>
                        {assignment.note && (
                          <p className="text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">
                            {assignment.note}
                          </p>
                        )}
                      </div>
                      {plan?.status && (
                        <Badge value={plan.status} />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
