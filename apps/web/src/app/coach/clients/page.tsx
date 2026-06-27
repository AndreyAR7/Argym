import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import { Users } from 'lucide-react'

export const metadata = { title: 'Mis Clientes' }

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
}

export default async function CoachClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const params = await searchParams
  const search = params.search ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get unique client IDs from this coach's appointments
  const { data: aptRows } = await supabase
    .from('appointments')
    .select('client_id')
    .eq('coach_id', user!.id)
    .not('client_id', 'is', null)

  const clientIds = [...new Set((aptRows ?? []).map((a: any) => a.client_id as string))]

  let clients: any[] = []
  let total = 0

  if (clientIds.length > 0) {
    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, phone, client_level, is_active, approval_status, created_at', { count: 'exact' })
      .in('id', clientIds)
      .order('full_name', { ascending: true })

    if (search) query = query.ilike('full_name', `%${search}%`)

    const { data, count } = await query
    clients = data ?? []
    total = count ?? 0
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Mis Clientes"
        subtitle={`${total} cliente${total !== 1 ? 's' : ''} con citas contigo`}
      />

      {/* Search */}
      <form className="mt-6" method="get">
        <input
          name="search"
          type="search"
          defaultValue={search}
          placeholder="Buscar cliente..."
          className="max-w-xs w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)]"
        />
      </form>

      {/* Table */}
      <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Nivel</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Miembro desde</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {clients.length > 0 ? (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-[var(--color-muted)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={client.full_name ?? '?'} src={client.avatar_url} size="sm" className="bg-[var(--color-client-light)]" />
                      <div>
                        <p className="font-medium text-[var(--color-foreground)]">{client.full_name ?? '—'}</p>
                        {client.phone && (
                          <p className="text-xs text-[var(--color-muted-foreground)]">{client.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {client.client_level ? (
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {LEVEL_LABELS[client.client_level] ?? client.client_level}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={client.is_active === false ? 'inactive' : client.approval_status ?? 'pending'} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-muted-foreground)] hidden lg:table-cell">
                    {formatDate(client.created_at)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Users size={32} className="text-[var(--color-border)]" />
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {search
                        ? `Sin resultados para "${search}"`
                        : 'Aún no tienes clientes con citas programadas'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
