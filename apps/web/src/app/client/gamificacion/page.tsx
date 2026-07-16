import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { CheckinButton } from './checkin-button'

export const metadata = { title: 'Game Hub · Gamificación' }

// ---------------------------------------------------------------------------
// Types inferred from DB shape
// ---------------------------------------------------------------------------
interface GameStats {
  user_id: string
  tenant_id: string
  level: number
  xp_total: number
  xp_this_week: number
  current_streak: number
  longest_streak: number
  total_checkins: number
  app_current_streak: number
  app_longest_streak: number
  app_total_checkins: number
}

interface LevelDefinition {
  level: number
  name: string
  xp_required: number
  perks?: string | null
}

interface BadgeRow {
  id: string
  earned_at: string
  badge_definitions: {
    id: string
    name: string
    icon: string
    description: string | null
  } | null
}

interface LeaderboardRow {
  user_id: string
  full_name: string
  xp_total: number
  level: number
  is_me: boolean
}

// ---------------------------------------------------------------------------
// Quick-nav card data
// ---------------------------------------------------------------------------
const NAV_CARDS = [
  {
    href: '/client/gamificacion/ranking',
    icon: '🏆',
    title: 'Ranking',
    subtitle: 'Compite con otros miembros',
  },
  {
    href: '/client/gamificacion/logros',
    icon: '🥇',
    title: 'Logros',
    subtitle: 'Tus badges y medallas',
  },
  {
    href: '/client/gamificacion/retos',
    icon: '⚡',
    title: 'Retos',
    subtitle: 'Desafíos activos esta semana',
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function GamificacionPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')

  const { supabase, tenantId, user } = session
  const userId = user.id

  // Today's window for check-in count
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // ── Parallel data fetch ─────────────────────────────────────────────────
  const [
    statsResult,
    todayCheckinResult,
    recentBadgesResult,
    leaderboardResult,
  ] = await Promise.all([
    supabase
      .from('user_game_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single(),

    supabase
      .from('gym_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('method', 'app')
      .gte('checked_in_at', todayStart.toISOString()),

    supabase
      .from('user_badges')
      .select('id, earned_at, badge_definitions(*)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('earned_at', { ascending: false })
      .limit(3),

    supabase.rpc('get_leaderboard', {
      p_tenant_id: tenantId,
      p_limit: 100,
    }),
  ])

  const stats: GameStats | null = statsResult.data ?? null
  const todayCount: number = todayCheckinResult.count ?? 0

  const recentBadges: BadgeRow[] = (recentBadgesResult.data ?? []).map(
    (b: any) => ({
      ...b,
      badge_definitions: Array.isArray(b.badge_definitions)
        ? (b.badge_definitions[0] ?? null)
        : b.badge_definitions,
    }),
  )

  const leaderboard: LeaderboardRow[] = leaderboardResult.data ?? []
  const myRank =
    leaderboard.findIndex((row: LeaderboardRow) => row.is_me) + 1 || null

  // Fetch level definitions (current + next) after we know the level
  const currentLevel = stats?.level ?? 1
  const [currentLevelResult, nextLevelResult] = await Promise.all([
    supabase
      .from('level_definitions')
      .select('*')
      .eq('level', currentLevel)
      .single(),
    supabase
      .from('level_definitions')
      .select('*')
      .eq('level', currentLevel + 1)
      .single(),
  ])

  const currentLevelDef: LevelDefinition | null = currentLevelResult.data ?? null
  const nextLevelDef: LevelDefinition | null = nextLevelResult.data ?? null

  // XP progress within the current level
  const xpTotal = stats?.xp_total ?? 0
  const xpBase = currentLevelDef?.xp_required ?? 0
  const xpNext = nextLevelDef?.xp_required ?? null
  const progressPct =
    xpNext != null && xpNext > xpBase
      ? Math.min(100, Math.round(((xpTotal - xpBase) / (xpNext - xpBase)) * 100))
      : xpNext == null
        ? 100
        : 0

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Game Hub"
        subtitle="Tu progreso, logros y recompensas"
      />

      {/* ── Section 1: Level Hero Card ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--color-client)] to-[var(--color-client)]/60 p-6 text-white shadow-md">
        {/* Background decoration */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />

        {stats ? (
          <div className="relative space-y-4">
            {/* Level label + name */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                Tu nivel
              </p>
              <p className="mt-0.5 text-4xl font-extrabold leading-none tracking-tight">
                {currentLevel}
              </p>
              <p className="mt-1 text-lg font-semibold text-white/90">
                {currentLevelDef?.name ?? `Nivel ${currentLevel}`}
              </p>
            </div>

            {/* XP progress bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-white/80">
                {xpTotal.toLocaleString()} XP
                {xpNext != null && (
                  <>
                    {' · '}
                    faltan{' '}
                    <span className="font-semibold">
                      {(xpNext - xpTotal).toLocaleString()} XP
                    </span>{' '}
                    para nivel {currentLevel + 1}
                    {nextLevelDef?.name ? ` (${nextLevelDef.name})` : ''}
                  </>
                )}
                {xpNext == null && ' · Nivel máximo alcanzado 🎉'}
              </p>
            </div>
          </div>
        ) : (
          /* No stats yet */
          <div className="relative flex flex-col items-start gap-3">
            <p className="text-3xl font-extrabold leading-none">¡Bienvenido!</p>
            <p className="text-base text-white/85">
              Comienza tu aventura — haz tu primer check-in para desbloquear tu perfil de jugador.
            </p>
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              Nivel 1 · 0 XP
            </span>
          </div>
        )}
      </div>

      {/* ── Section 2: Stats grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: '🔥',
            label: 'Racha',
            value: `${stats?.app_current_streak ?? 0} días`,
          },
          {
            icon: '📍',
            label: 'Check-ins en app',
            value: stats?.app_total_checkins ?? 0,
          },
          {
            icon: '⚡',
            label: 'XP esta semana',
            value: (stats?.xp_this_week ?? 0).toLocaleString(),
          },
          {
            icon: '🏆',
            label: 'Posición',
            value: myRank != null ? `#${myRank}` : '—',
          },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            className="flex flex-col gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <span className="text-xl leading-none">{icon}</span>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Section 3: Daily check-in card ────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="mb-5 text-center">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Check-in Diario
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Gana 50 XP base + bonus por racha
          </p>
        </div>
        <div className="flex justify-center">
          <CheckinButton
            userId={userId}
            tenantId={tenantId}
            alreadyCheckedIn={todayCount > 0}
          />
        </div>
      </div>

      {/* ── Section 4: Quick-nav cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {NAV_CARDS.map(({ href, icon, title, subtitle }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition-all hover:border-[var(--color-client)]/40 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-client-light)] text-xl">
                {icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  {title}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {subtitle}
                </p>
              </div>
            </div>
            <svg
              className="h-4 w-4 flex-shrink-0 text-[var(--color-muted-foreground)] transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      {/* ── Section 5: Recent badges ───────────────────────────────────── */}
      {recentBadges.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Logros recientes
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentBadges.map((b) => {
              const def = b.badge_definitions
              if (!def) return null
              return (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] shadow-sm"
                  title={def.description ?? def.name}
                >
                  <span className="text-base leading-none">{def.icon}</span>
                  {def.name}
                </span>
              )
            })}
            <Link
              href="/client/gamificacion/logros"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
            >
              Ver todos →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
