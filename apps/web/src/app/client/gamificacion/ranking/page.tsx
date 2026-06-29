import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { ChevronLeft } from 'lucide-react'

export const metadata = { title: 'Ranking' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardRow {
  rank: number
  user_id: string
  full_name: string
  level: number
  xp_total: number
  xp_this_week: number
  xp_this_month: number
  current_streak: number
  total_checkins: number
  total_challenges_won: number
  is_me: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Periodo = 'semana' | 'mes' | 'total'
type RpcPeriod = 'week' | 'month' | 'all'

const PERIOD_MAP: Record<Periodo, RpcPeriod> = {
  semana: 'week',
  mes: 'month',
  total: 'all',
}

const PERIOD_LABEL: Record<Periodo, string> = {
  semana: 'Esta Semana',
  mes: 'Este Mes',
  total: 'Total',
}

const PERIOD_XP_KEY: Record<Periodo, keyof LeaderboardRow> = {
  semana: 'xp_this_week',
  mes: 'xp_this_month',
  total: 'xp_total',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl leading-none">🥇</span>
  if (rank === 2) return <span className="text-xl leading-none">🥈</span>
  if (rank === 3) return <span className="text-xl leading-none">🥉</span>
  return (
    <span className="text-sm font-bold tabular-nums text-[var(--color-muted-foreground)] w-7 text-center inline-block">
      {rank}
    </span>
  )
}

// ─── Row (desktop table) ─────────────────────────────────────────────────────

function LeaderboardTableRow({ row, periodo }: { row: LeaderboardRow; periodo: Periodo }) {
  const xpValue = row[PERIOD_XP_KEY[periodo]] as number
  const isTop3 = row.rank <= 3

  return (
    <tr
      className={[
        'border-b border-[var(--color-border)] transition-colors',
        row.is_me
          ? 'bg-[var(--color-client-light)] border-l-2 border-l-[var(--color-client)]'
          : 'hover:bg-[var(--color-muted)]/40',
      ].join(' ')}
    >
      {/* Rank */}
      <td className="pl-4 pr-2 py-3 w-10 text-center">
        <RankMedal rank={row.rank} />
      </td>

      {/* Avatar + Name */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{
              backgroundColor: 'var(--color-client-light)',
              color: 'var(--color-client)',
            }}
          >
            {initials(row.full_name)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={[
                'text-sm',
                row.is_me || isTop3 ? 'font-bold text-[var(--color-foreground)]' : 'font-medium text-[var(--color-foreground)]',
              ].join(' ')}
            >
              {row.full_name}
            </span>
            {row.is_me && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--color-client)',
                  color: '#fff',
                }}
              >
                Tú
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Level */}
      <td className="px-3 py-3 hidden sm:table-cell">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full border"
          style={{
            borderColor: 'var(--color-client)',
            color: 'var(--color-client)',
          }}
        >
          Nv. {row.level}
        </span>
      </td>

      {/* XP */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm font-black tabular-nums" style={{ color: 'var(--color-client)' }}>
          ⚡ {xpValue.toLocaleString('es-CR')}
        </span>
      </td>

      {/* Streak */}
      <td className="px-4 py-3 text-right hidden md:table-cell">
        {row.current_streak > 0 && (
          <span className="text-sm font-semibold text-amber-500 tabular-nums">
            🔥 {row.current_streak}
          </span>
        )}
      </td>
    </tr>
  )
}

// ─── Card (mobile) ────────────────────────────────────────────────────────────

function LeaderboardCard({ row, periodo }: { row: LeaderboardRow; periodo: Periodo }) {
  const xpValue = row[PERIOD_XP_KEY[periodo]] as number

  return (
    <div
      className={[
        'rounded-xl border p-3 flex items-center gap-3 transition-colors',
        row.is_me
          ? 'bg-[var(--color-client-light)] border-[var(--color-client)] border-l-4'
          : 'bg-[var(--color-card)] border-[var(--color-border)]',
      ].join(' ')}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center flex-shrink-0">
        <RankMedal rank={row.rank} />
      </div>

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-client-light)',
          color: 'var(--color-client)',
        }}
      >
        {initials(row.full_name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={[
              'text-sm leading-tight truncate',
              row.is_me ? 'font-bold text-[var(--color-foreground)]' : 'font-medium text-[var(--color-foreground)]',
            ].join(' ')}
          >
            {row.full_name}
          </span>
          {row.is_me && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--color-client)', color: '#fff' }}
            >
              Tú
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded-full border"
            style={{ borderColor: 'var(--color-client)', color: 'var(--color-client)' }}
          >
            Nv. {row.level}
          </span>
          {row.current_streak > 0 && (
            <span className="text-xs font-semibold text-amber-500">🔥 {row.current_streak}</span>
          )}
        </div>
      </div>

      {/* XP */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black tabular-nums" style={{ color: 'var(--color-client)' }}>
          ⚡ {xpValue.toLocaleString('es-CR')}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)]">XP</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const session = await getSessionData()
  if (!session) redirect('/login')
  const { supabase, tenantId } = session

  const params = await searchParams
  const rawPeriodo = params.periodo as Periodo | undefined
  const periodo: Periodo =
    rawPeriodo && rawPeriodo in PERIOD_MAP ? rawPeriodo : 'semana'
  const period: RpcPeriod = PERIOD_MAP[periodo]

  const { data: rows, error } = await supabase.rpc('get_leaderboard', {
    p_tenant_id: tenantId,
    p_period: period,
    p_limit: 50,
  })

  const leaderboard: LeaderboardRow[] = (rows ?? []) as LeaderboardRow[]

  // ── Render ─────────────────────────────────────────────────────────────────
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

      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-[var(--color-foreground)]">🏆 Ranking</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          {PERIOD_LABEL[periodo]} · {leaderboard.length} participantes
        </p>
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

      {/* Empty state */}
      {leaderboard.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Sin datos de ranking aún.
          </p>
        </div>
      )}

      {/* Desktop table — hidden on mobile */}
      {leaderboard.length > 0 && (
        <div className="hidden sm:block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="pl-4 pr-2 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider w-10">
                  #
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Atleta
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden sm:table-cell">
                  Nivel
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  XP
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">
                  Racha
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <LeaderboardTableRow key={row.user_id} row={row} periodo={periodo} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile card list — shown only on mobile */}
      {leaderboard.length > 0 && (
        <div className="sm:hidden space-y-2">
          {leaderboard.map((row) => (
            <LeaderboardCard key={row.user_id} row={row} periodo={periodo} />
          ))}
        </div>
      )}

      {/* "My position" sticky hint — only if user found and not already top-visible */}
      {(() => {
        const meRow = leaderboard.find((r) => r.is_me)
        if (!meRow) return null
        return (
          <div
            className="rounded-xl border p-3 flex items-center gap-3"
            style={{
              borderColor: 'var(--color-client)',
              backgroundColor: 'var(--color-client-light)',
            }}
          >
            <span className="text-lg">📍</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--color-foreground)]">Tu posición</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Estás en el puesto #{meRow.rank} con ⚡{' '}
                {(meRow[PERIOD_XP_KEY[periodo]] as number).toLocaleString('es-CR')} XP
              </p>
            </div>
            <div className="flex-shrink-0">
              <RankMedal rank={meRow.rank} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}
