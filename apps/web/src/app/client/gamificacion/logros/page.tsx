import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { ChevronLeft } from 'lucide-react'

export const metadata = { title: 'Logros' }

// ─── Types ────────────────────────────────────────────────────────────────────

type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

interface BadgeDefinition {
  id: string
  name: string
  description: string | null
  icon_emoji: string | null
  rarity: Rarity
  xp_reward: number
  condition_type: string | null
  condition_value: number | null
  sort_order: number
  is_active: boolean
}

interface UserBadge {
  id: string
  badge_id: string
  user_id: string
  tenant_id: string
  earned_at: string
  badge_definitions: BadgeDefinition | null
}

interface EarnedBadge extends BadgeDefinition {
  earned_at: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
}

const RARITY_STYLES: Record<
  Rarity,
  { border: string; chip: string; shadow?: string }
> = {
  common: {
    border: 'border-gray-300 dark:border-gray-600',
    chip: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  },
  rare: {
    border: 'border-blue-400',
    chip: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
  },
  epic: {
    border: 'border-purple-400',
    chip: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300',
  },
  legendary: {
    border: 'border-yellow-400',
    chip: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-300',
    shadow: 'shadow-lg shadow-yellow-400/30',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEarnedDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function conditionHint(badge: BadgeDefinition): string {
  if (!badge.condition_type || badge.condition_value == null) return ''
  const val = badge.condition_value
  switch (badge.condition_type) {
    case 'checkins':
      return `Completa ${val} check-in${val !== 1 ? 's' : ''}`
    case 'streak':
      return `Mantén una racha de ${val} día${val !== 1 ? 's' : ''}`
    case 'challenges_won':
      return `Gana ${val} desafío${val !== 1 ? 's' : ''}`
    case 'xp_total':
      return `Acumula ${val.toLocaleString('es-CR')} XP`
    case 'level':
      return `Alcanza el nivel ${val}`
    default:
      return `${badge.condition_type}: ${val}`
  }
}

// ─── Badge Card (Earned) ──────────────────────────────────────────────────────

function EarnedBadgeCard({ badge }: { badge: EarnedBadge }) {
  const rarity = badge.rarity ?? 'common'
  const styles = RARITY_STYLES[rarity] ?? RARITY_STYLES.common

  return (
    <div
      className={[
        'rounded-2xl border-2 bg-[var(--color-card)] p-4 flex flex-col items-center text-center gap-2 transition-transform hover:-translate-y-0.5',
        styles.border,
        styles.shadow ?? '',
      ].join(' ')}
    >
      {/* Icon */}
      <div className="text-4xl leading-none">{badge.icon_emoji ?? '🏅'}</div>

      {/* Rarity chip */}
      <span
        className={[
          'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
          styles.chip,
        ].join(' ')}
      >
        {RARITY_LABEL[rarity]}
      </span>

      {/* Name */}
      <p className="text-sm font-bold text-[var(--color-foreground)] leading-tight">
        {badge.name}
      </p>

      {/* Description */}
      {badge.description && (
        <p className="text-xs text-[var(--color-muted-foreground)] leading-snug line-clamp-3">
          {badge.description}
        </p>
      )}

      {/* XP reward */}
      <p className="text-xs font-bold mt-auto" style={{ color: 'var(--color-client)' }}>
        ⚡ {badge.xp_reward.toLocaleString('es-CR')} XP
      </p>

      {/* Earned date */}
      <p className="text-[11px] text-[var(--color-muted-foreground)]">
        Ganado el {formatEarnedDate(badge.earned_at)}
      </p>
    </div>
  )
}

// ─── Badge Card (Locked) ──────────────────────────────────────────────────────

function LockedBadgeCard({ badge }: { badge: BadgeDefinition }) {
  const hint = conditionHint(badge)

  return (
    <div
      className={[
        'rounded-2xl border-2 border-gray-300 dark:border-gray-700 bg-[var(--color-card)]',
        'p-4 flex flex-col items-center text-center gap-2 opacity-50 grayscale',
      ].join(' ')}
    >
      {/* Icon */}
      <div className="text-4xl leading-none">{badge.icon_emoji ?? '🏅'}</div>

      {/* Rarity chip (gray) */}
      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {RARITY_LABEL[badge.rarity ?? 'common']}
      </span>

      {/* Name */}
      <p className="text-sm font-bold text-[var(--color-foreground)] leading-tight">
        {badge.name}
      </p>

      {/* Description */}
      {badge.description && (
        <p className="text-xs text-[var(--color-muted-foreground)] leading-snug line-clamp-3">
          {badge.description}
        </p>
      )}

      {/* XP reward */}
      <p className="text-xs font-bold mt-auto text-[var(--color-muted-foreground)]">
        ⚡ {badge.xp_reward.toLocaleString('es-CR')} XP
      </p>

      {/* Condition hint */}
      {hint && (
        <p className="text-[11px] text-[var(--color-muted-foreground)] italic">{hint}</p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LogrosPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')
  const { supabase, tenantId, user } = session
  const userId = user.id

  // Fetch badge definitions and user badges in parallel
  const [{ data: allBadgesRaw }, { data: userBadgesRaw }] = await Promise.all([
    supabase
      .from('badge_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('user_badges')
      .select('*, badge_definitions(*)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('earned_at', { ascending: false }),
  ])

  const allBadges: BadgeDefinition[] = (allBadgesRaw ?? []) as BadgeDefinition[]
  const userBadges: UserBadge[] = (userBadgesRaw ?? []) as UserBadge[]

  // Compute sets
  const earnedIds = new Set(userBadges.map((b) => b.badge_id))

  const earnedBadges: EarnedBadge[] = allBadges
    .filter((b) => earnedIds.has(b.id))
    .map((b) => {
      const ub = userBadges.find((u) => u.badge_id === b.id)!
      return { ...b, earned_at: ub.earned_at }
    })

  const lockedBadges: BadgeDefinition[] = allBadges.filter((b) => !earnedIds.has(b.id))

  const totalXpFromBadges = userBadges.reduce(
    (sum, b) => sum + (b.badge_definitions?.xp_reward ?? 0),
    0,
  )

  const earned = earnedBadges.length
  const total = allBadges.length
  const progressPct = total > 0 ? Math.round((earned / total) * 100) : 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">

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
        <h1 className="text-2xl font-black text-[var(--color-foreground)]">🏅 Logros</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Tus insignias y recompensas
        </p>
      </div>

      {/* Stats bar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-lg font-black text-[var(--color-foreground)]">
              {earned}
              <span className="text-[var(--color-muted-foreground)] font-normal text-base">
                /{total} logros
              </span>
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              ⚡ {totalXpFromBadges.toLocaleString('es-CR')} XP ganados de logros
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black" style={{ color: 'var(--color-client)' }}>
              {progressPct}%
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">completado</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              backgroundColor: 'var(--color-client)',
            }}
          />
        </div>
      </div>

      {/* ── Earned section ── */}
      {earned > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
            Ganados
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: 'var(--color-client)' }}
            >
              {earned}
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {earnedBadges.map((badge) => (
              <EarnedBadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty earned state ── */}
      {earned === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center">
          <p className="text-3xl mb-3">🏅</p>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Aún no has ganado ningún logro
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Completa entrenamientos y desafíos para desbloquear insignias.
          </p>
        </div>
      )}

      {/* ── Locked section ── */}
      {lockedBadges.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-bold text-[var(--color-foreground)] flex items-center gap-2">
            Por ganar
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
              {lockedBadges.length}
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {lockedBadges.map((badge) => (
              <LockedBadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
