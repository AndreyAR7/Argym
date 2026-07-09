import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { DeactivateChallengeButton } from './deactivate-challenge-button'
import { CreateChallengeButton } from './create-challenge-button'
import {
  Trophy, Zap, Users, Target,
  Flame, Star, Medal,
  ShieldCheck,
} from 'lucide-react'

export const metadata = { title: 'Gamificación' }

// ── Types ──────────────────────────────────────────────────────────

interface LeaderboardRow {
  rank: number
  user_id: string
  full_name: string | null
  level: number
  xp_total: number
  xp_this_week: number
  xp_this_month: number
  current_streak: number
  total_checkins: number
  total_challenges_won: number
  is_me: boolean
}

interface Challenge {
  id: string
  title: string
  description: string | null
  type: 'global' | '1v1' | 'group' | string
  status: string
  xp_reward: number
  expires_at: string | null
  created_at: string
  challenge_participants: { count: number }[]
}

// ── Page ───────────────────────────────────────────────────────────

export default async function GamificacionPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')
  const { supabase, tenantId } = session

  // ── Parallel data fetching ──
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    leaderboardResult,
    challengesResult,
    { count: activeGamers },
    { data: xpThisMonth },
  ] = await Promise.all([
    supabase.rpc('get_leaderboard', {
      p_tenant_id: tenantId,
      p_period: 'all',
      p_limit: 20,
    }),

    supabase
      .from('challenges')
      .select('*, challenge_participants(count)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),

    supabase
      .from('user_game_stats')
      .select('user_id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),

    supabase
      .from('xp_transactions')
      .select('amount')
      .eq('tenant_id', tenantId)
      .gte('created_at', monthStart.toISOString()),
  ])

  const leaderboard = (leaderboardResult.data ?? []) as LeaderboardRow[]
  const challenges  = (challengesResult.data ?? []) as Challenge[]

  const avgLevel =
    leaderboard.length > 0
      ? Math.round(leaderboard.reduce((a, r) => a + (r.level ?? 1), 0) / leaderboard.length)
      : 0

  const totalXpMonth = (xpThisMonth ?? []).reduce(
    (acc: number, row: { amount: number }) => acc + (row.amount ?? 0),
    0,
  )

  const activeChallengesCount = challenges.length

  return (
    <div className="p-4 md:p-8 max-w-[1400px]">
      <PageHeader
        title="Gamificación"
        subtitle="Gestión de retos, rankings y logros"
      />

      {/* ── Stats grid ── */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Jugadores activos"
          value={activeGamers ?? 0}
          icon={<Users size={16} />}
          color="violet"
        />
        <StatCard
          label="Nivel promedio"
          value={avgLevel}
          icon={<Star size={16} />}
          color="amber"
        />
        <StatCard
          label="XP otorgado este mes"
          value={totalXpMonth.toLocaleString('es-CR')}
          icon={<Zap size={16} />}
          color="emerald"
        />
        <StatCard
          label="Retos activos"
          value={activeChallengesCount}
          icon={<Target size={16} />}
          color="blue"
        />
      </div>

      {/* ── Leaderboard ── */}
      <section className="mt-8">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg border border-amber-200 bg-amber-50 flex items-center justify-center text-amber-600">
            <Trophy size={15} />
          </div>
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Ranking Global</h2>
          <span className="text-xs text-[var(--color-muted-foreground)] bg-[var(--color-muted)] px-2 py-0.5 rounded-full">
            Top {leaderboard.length}
          </span>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider w-12">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Jugador
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Nivel
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  XP Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">
                  XP semana
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">
                  Racha
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">
                  Check-ins
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {leaderboard.length > 0 ? (
                leaderboard.map((row, idx) => (
                  <tr
                    key={row.user_id}
                    className={`transition-colors hover:bg-[var(--color-muted)] ${
                      idx % 2 === 0 ? 'bg-[var(--color-card)]' : 'bg-[var(--color-background)]'
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 text-center">
                      {row.rank <= 3 ? (
                        <RankBadge rank={row.rank} />
                      ) : (
                        <span className="text-xs font-medium text-[var(--color-muted-foreground)] tabular-nums">
                          {row.rank}
                        </span>
                      )}
                    </td>

                    {/* Player */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={row.full_name ?? '?'} />
                        <span className="font-medium text-[var(--color-foreground)]">
                          {row.full_name ?? 'Usuario'}
                        </span>
                      </div>
                    </td>

                    {/* Level */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-semibold text-violet-700">
                        <Medal size={10} />
                        Nv. {row.level ?? 1}
                      </span>
                    </td>

                    {/* XP Total */}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--color-foreground)]">
                      {(row.xp_total ?? 0).toLocaleString('es-CR')}
                      <span className="ml-1 text-xs font-normal text-[var(--color-muted-foreground)]">xp</span>
                    </td>

                    {/* XP Week */}
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-muted-foreground)] hidden md:table-cell">
                      {(row.xp_this_week ?? 0).toLocaleString('es-CR')}
                      <span className="ml-1 text-xs">xp</span>
                    </td>

                    {/* Streak */}
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                        <Flame size={13} />
                        {row.current_streak ?? 0}d
                      </span>
                    </td>

                    {/* Check-ins */}
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-muted-foreground)] hidden lg:table-cell">
                      {(row.total_checkins ?? 0).toLocaleString('es-CR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Trophy size={32} className="text-[var(--color-border)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-foreground)]">
                          Aún no hay datos de ranking
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                          El ranking se construye cuando los usuarios empiezan a ganar XP
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Active Challenges ── */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 flex items-center justify-center text-blue-600">
              <Target size={15} />
            </div>
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Retos Activos</h2>
            <span className="text-xs text-[var(--color-muted-foreground)] bg-[var(--color-muted)] px-2 py-0.5 rounded-full">
              {challenges.length}
            </span>
          </div>
          <CreateChallengeButton />
        </div>

        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Reto
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden sm:table-cell">
                  Tipo
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">
                  Participantes
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">
                  XP
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">
                  Vence
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {challenges.length > 0 ? (
                challenges.map((challenge, idx) => {
                  const participantCount =
                    challenge.challenge_participants?.[0]?.count ?? 0

                  return (
                    <tr
                      key={challenge.id}
                      className={`transition-colors hover:bg-[var(--color-muted)] ${
                        idx % 2 === 0 ? 'bg-[var(--color-card)]' : 'bg-[var(--color-background)]'
                      }`}
                    >
                      {/* Title + status */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[var(--color-foreground)]">
                              {challenge.title}
                            </p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                              <ShieldCheck size={9} />
                              Activo
                            </span>
                          </div>
                          {challenge.description && (
                            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-1">
                              {challenge.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <ChallengeTypePill type={challenge.type} />
                      </td>

                      {/* Participants */}
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
                          <Users size={12} />
                          {participantCount}
                        </span>
                      </td>

                      {/* XP reward */}
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 tabular-nums">
                          <Zap size={12} />
                          {(challenge.xp_reward ?? 0).toLocaleString('es-CR')}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3 text-center text-xs text-[var(--color-muted-foreground)] hidden lg:table-cell">
                        {challenge.expires_at
                          ? formatDate(challenge.expires_at)
                          : <span className="italic">Sin límite</span>
                        }
                      </td>

                      {/* Deactivate */}
                      <td className="px-4 py-3 text-right">
                        <DeactivateChallengeButton challengeId={challenge.id} />
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Target size={32} className="text-[var(--color-border)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--color-foreground)]">
                          No hay retos activos
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                          Crea un reto para motivar a tus clientes
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: 'violet' | 'emerald' | 'blue' | 'amber'
}

const colorMap = {
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100'   },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100'  },
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-foreground)] truncate">
            {value}
          </p>
        </div>
        <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${c.bg} ${c.border} border`}>
          <span className={c.text}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
      <span className="text-[11px] font-semibold text-violet-700">{initials || '?'}</span>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const map: Record<number, { icon: string; className: string }> = {
    1: { icon: '🥇', className: 'text-amber-500' },
    2: { icon: '🥈', className: 'text-slate-400' },
    3: { icon: '🥉', className: 'text-orange-500' },
  }
  const entry = map[rank]
  if (!entry) return <span className="text-xs font-medium text-[var(--color-muted-foreground)]">{rank}</span>
  return <span className="text-base" title={`Puesto ${rank}`}>{entry.icon}</span>
}

const CHALLENGE_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  global: { label: 'Global',  className: 'bg-violet-50 border-violet-200 text-violet-700' },
  '1v1':  { label: '1 vs 1', className: 'bg-rose-50 border-rose-200 text-rose-700'       },
  group:  { label: 'Grupo',   className: 'bg-blue-50 border-blue-200 text-blue-700'       },
}

function ChallengeTypePill({ type }: { type: string }) {
  const entry = CHALLENGE_TYPE_LABELS[type] ?? {
    label: type,
    className: 'bg-[var(--color-muted)] border-[var(--color-border)] text-[var(--color-muted-foreground)]',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${entry.className}`}>
      {entry.label}
    </span>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
