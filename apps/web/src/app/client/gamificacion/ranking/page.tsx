import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { ChevronLeft } from 'lucide-react'
import { LeaderboardRealtime, type LeaderboardRow } from './leaderboard-realtime'

export const metadata = { title: 'Ranking' }

type Periodo  = 'semana' | 'mes' | 'total'
type RpcPeriod = 'week'  | 'month' | 'all'

const PERIOD_MAP: Record<Periodo, RpcPeriod> = {
  semana: 'week',
  mes:    'month',
  total:  'all',
}

const PERIOD_LABEL: Record<Periodo, string> = {
  semana: 'Esta Semana',
  mes:    'Este Mes',
  total:  'Total',
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const session = await getSessionData()
  if (!session) redirect('/login')
  const { supabase, tenantId } = session

  const params     = await searchParams
  const rawPeriodo = params.periodo as Periodo | undefined
  const periodo: Periodo =
    rawPeriodo && rawPeriodo in PERIOD_MAP ? rawPeriodo : 'semana'

  const { data: rows } = await supabase.rpc('get_leaderboard', {
    p_tenant_id: tenantId,
    p_period:    PERIOD_MAP[periodo],
    p_limit:     50,
  })

  const leaderboard: LeaderboardRow[] = (rows ?? []) as LeaderboardRow[]

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

      {/* Back link */}
      <Link
        href="/client/gamificacion"
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <ChevronLeft size={16} />
        Gamificación
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-foreground)]">🏆 Ranking</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            {PERIOD_LABEL[periodo]} · {leaderboard.length} participantes
          </p>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-[var(--color-muted)] w-fit">
        {(['semana', 'mes', 'total'] as Periodo[]).map((p) => {
          const isActive = p === periodo
          return (
            <Link
              key={p}
              href={`/client/gamificacion/ranking?periodo=${p}`}
              className={[
                'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
              style={isActive ? { backgroundColor: 'var(--color-client)' } : {}}
            >
              {PERIOD_LABEL[p]}
            </Link>
          )
        })}
      </div>

      {/* Leaderboard — Realtime client component */}
      <LeaderboardRealtime
        initialRows={leaderboard}
        tenantId={tenantId}
        periodo={periodo}
      />

    </div>
  )
}
