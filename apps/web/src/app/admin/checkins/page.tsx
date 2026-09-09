import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { CheckinResultBadge } from '@/components/admin/checkin-result-badge'
import { Download, QrCode, CheckCircle2, AlertTriangle, Users } from 'lucide-react'

export const metadata = { title: 'Asistencia (QR)' }

const RESULT_TABS = [
  { value: 'all',                    label: 'Todos' },
  { value: 'success',                label: 'Exitosos' },
  { value: 'weekly_limit_reached',   label: 'Bloqueados por límite' },
  { value: 'no_active_membership',   label: 'Sin membresía' },
  { value: 'already_checked_in',     label: 'Ya registrado' },
]

const PAGE_SIZE = 30

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function CheckinsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; from?: string; to?: string; branch?: string; page?: string }>
}) {
  const params = await searchParams
  const resultFilter = params.result ?? 'all'
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const offset = (page - 1) * PAGE_SIZE

  const to = params.to ? new Date(`${params.to}T23:59:59`) : new Date()
  const from = params.from ? new Date(`${params.from}T00:00:00`) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const { data: branches } = await supabase
    .from('branches').select('id, name').eq('tenant_id', tenantId).eq('is_active', true).order('name')

  let query = supabase
    .from('checkin_attempts')
    .select(`
      id, created_at, result, weekly_limit, weekly_count,
      user:profiles!checkin_attempts_user_id_fkey(full_name),
      branch:branches!checkin_attempts_branch_id_fkey(name),
      plan:plans!checkin_attempts_plan_id_fkey(name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (resultFilter !== 'all') query = query.eq('result', resultFilter)
  if (params.branch) query = query.eq('branch_id', params.branch)
  query = query.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1)

  const [{ data: attempts, count, error: loadError }, { count: successCount }, { count: blockedCount }, { data: blockedRows }] = await Promise.all([
    query,
    supabase.from('checkin_attempts').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('result', 'success')
      .gte('created_at', from.toISOString()).lte('created_at', to.toISOString()),
    supabase.from('checkin_attempts').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('result', 'weekly_limit_reached')
      .gte('created_at', from.toISOString()).lte('created_at', to.toISOString()),
    supabase.from('checkin_attempts')
      .select('user_id, user:profiles!checkin_attempts_user_id_fkey(full_name)')
      .eq('tenant_id', tenantId).eq('result', 'weekly_limit_reached')
      .gte('created_at', from.toISOString()).lte('created_at', to.toISOString())
      .limit(500),
  ])

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Top offenders — clients who most often hit their weekly limit in range
  const offenderCounts = new Map<string, { name: string; count: number }>()
  for (const row of (blockedRows ?? []) as any[]) {
    const name = Array.isArray(row.user) ? row.user[0]?.full_name : row.user?.full_name
    const existing = offenderCounts.get(row.user_id)
    offenderCounts.set(row.user_id, { name: name ?? '—', count: (existing?.count ?? 0) + 1 })
  }
  const topOffenders = Array.from(offenderCounts.values()).sort((a, b) => b.count - a.count).slice(0, 5)

  function buildUrl(overrides: Record<string, string>) {
    const sp = new URLSearchParams()
    const merged = { result: resultFilter, from: params.from ?? '', to: params.to ?? '', branch: params.branch ?? '', page: String(page), ...overrides }
    Object.entries(merged).forEach(([k, v]) => { if (v && v !== 'all' && v !== '1') sp.set(k, v) })
    const qs = sp.toString()
    return `/admin/checkins${qs ? `?${qs}` : ''}`
  }

  const exportQs = new URLSearchParams({
    from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10),
    ...(resultFilter !== 'all' ? { result: resultFilter } : {}),
    ...(params.branch ? { branch: params.branch } : {}),
  }).toString()

  return (
    <div className="p-4 md:p-8">
      {loadError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', color: 'var(--color-destructive)', border: '1px solid color-mix(in srgb, var(--color-destructive) 25%, transparent)' }}>
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          No se pudieron cargar los intentos de check-in ({loadError.message}). Es posible que tu rol no tenga el permiso necesario.
        </div>
      )}
      <PageHeader title="Asistencia (QR)" subtitle={`${count ?? 0} intentos de check-in en el rango seleccionado`}>
        <a
          href={`/api/admin/checkins/export?${exportQs}`}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
        >
          <Download size={14} />
          Exportar Excel
        </a>
      </PageHeader>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 size={18} className="text-emerald-600" /></div>
          <div>
            <p className="text-xl font-semibold text-[var(--color-foreground)]">{successCount ?? 0}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Check-ins exitosos</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><AlertTriangle size={18} className="text-amber-600" /></div>
          <div>
            <p className="text-xl font-semibold text-[var(--color-foreground)]">{blockedCount ?? 0}</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Bloqueados por límite semanal</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-[var(--color-muted-foreground)]" />
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">Top clientes bloqueados</p>
          </div>
          {topOffenders.length === 0 ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">Sin bloqueos en el rango</p>
          ) : (
            <ul className="space-y-1">
              {topOffenders.map((o, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-foreground)] truncate">{o.name}</span>
                  <span className="text-[var(--color-muted-foreground)] flex-shrink-0 ml-2">{o.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {RESULT_TABS.map(tab => (
          <Link key={tab.value} href={buildUrl({ result: tab.value, page: '1' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              resultFilter === tab.value
                ? 'bg-[var(--color-admin)] text-white border-[var(--color-admin)]'
                : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]'
            }`}>
            {tab.label}
          </Link>
        ))}
        <form className="flex items-center gap-2 ml-auto flex-wrap" action="/admin/checkins">
          {resultFilter !== 'all' && <input type="hidden" name="result" value={resultFilter} />}
          <input type="date" name="from" defaultValue={from.toISOString().slice(0, 10)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] px-2 py-1.5 text-xs text-[var(--color-foreground)]" />
          <input type="date" name="to" defaultValue={to.toISOString().slice(0, 10)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] px-2 py-1.5 text-xs text-[var(--color-foreground)]" />
          <select name="branch" defaultValue={params.branch ?? ''}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] px-2 py-1.5 text-xs text-[var(--color-foreground)]">
            <option value="">Todas las sucursales</option>
            {(branches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button type="submit" className="rounded-lg px-3 py-1.5 text-xs font-medium bg-[var(--color-muted)] text-[var(--color-foreground)]">
            Filtrar
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Sucursal</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Resultado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden sm:table-cell">Uso semanal</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {attempts && attempts.length > 0 ? (
              (attempts as any[]).map((a) => (
                <tr key={a.id} className="hover:bg-[var(--color-muted)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                    {Array.isArray(a.user) ? a.user[0]?.full_name : a.user?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{formatDateTime(a.created_at)}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)] hidden md:table-cell">
                    {Array.isArray(a.branch) ? a.branch[0]?.name : a.branch?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)] hidden lg:table-cell">
                    {Array.isArray(a.plan) ? a.plan[0]?.name : a.plan?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3"><CheckinResultBadge result={a.result} /></td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)] hidden sm:table-cell">
                    {a.weekly_limit != null ? `${a.weekly_count ?? 0}/${a.weekly_limit}` : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <QrCode size={32} className="text-[var(--color-border)]" />
                    <p className="text-sm text-[var(--color-muted-foreground)]">Sin intentos de check-in en el rango seleccionado</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-[var(--color-muted-foreground)]">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]">← Anterior</Link>}
            {page < totalPages && <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]">Siguiente →</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
