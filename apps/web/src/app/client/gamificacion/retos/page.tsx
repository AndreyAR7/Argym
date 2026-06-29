import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { ChallengeActions } from './challenge-actions'

export const metadata = { title: 'Retos' }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Challenge {
  id: string
  title: string
  description: string | null
  challenge_type: 'global' | '1v1' | 'group'
  xp_reward: number
  status: string
  starts_at: string | null
  expires_at: string | null
  max_participants: number | null
  creator_name: string | null
  participant_count: number
  my_status: 'pending' | 'accepted' | 'completed' | string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_ORDER: Record<string, number> = { pending: 0, accepted: 1, completed: 2 }

function sortChallenges(challenges: Challenge[]): Challenge[] {
  return [...challenges].sort(
    (a, b) => (STATUS_ORDER[a.my_status] ?? 99) - (STATUS_ORDER[b.my_status] ?? 99),
  )
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Type badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: Challenge['challenge_type'] }) {
  const map: Record<string, { label: string; className: string }> = {
    global: {
      label: 'Global',
      className:
        'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    },
    '1v1': {
      label: '1 vs 1',
      className:
        'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    },
    group: {
      label: 'Grupo',
      className:
        'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
    },
  }
  const cfg = map[type] ?? { label: type, className: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ myStatus }: { myStatus: string }) {
  if (myStatus === 'pending') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
        Invitación
      </span>
    )
  }
  if (myStatus === 'accepted') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
        En curso
      </span>
    )
  }
  if (myStatus === 'completed') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        Completado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">
      {myStatus}
    </span>
  )
}

// ── Challenge card ────────────────────────────────────────────────────────────
function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const isPendingInvite = challenge.my_status === 'pending'
  const expiryStr = formatDate(challenge.expires_at)

  return (
    <div
      className={[
        'rounded-xl border bg-[var(--color-card)] p-4 space-y-3 transition-shadow hover:shadow-sm',
        isPendingInvite
          ? 'border-amber-300/60 dark:border-amber-600/40 ring-1 ring-amber-300/30 dark:ring-amber-600/20'
          : 'border-[var(--color-border)]',
      ].join(' ')}
    >
      {/* Row 1: badges */}
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={challenge.challenge_type} />
        <StatusPill myStatus={challenge.my_status} />
      </div>

      {/* Row 2: title + description */}
      <div>
        <h2 className="text-base font-bold text-[var(--color-foreground)] leading-snug">
          {challenge.title}
        </h2>
        {challenge.description && (
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)] line-clamp-2">
            {challenge.description}
          </p>
        )}
      </div>

      {/* Row 3: meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
        <span className="font-semibold text-[var(--color-client)]">
          ⚡ {challenge.xp_reward} XP
        </span>
        <span>👥 {challenge.participant_count} participante{challenge.participant_count !== 1 ? 's' : ''}</span>
        {expiryStr && <span>Vence {expiryStr}</span>}
        {challenge.creator_name && <span>Creado por {challenge.creator_name}</span>}
      </div>

      {/* Row 4: actions */}
      <ChallengeActions
        challengeId={challenge.id}
        myStatus={challenge.my_status}
        xpReward={challenge.xp_reward}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function RetosPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')

  const { supabase, tenantId, userId } = session as any

  const { data, error } = await supabase.rpc('get_user_challenges', {
    p_user_id: userId,
    p_tenant_id: tenantId,
  })

  const challenges: Challenge[] = error ? [] : (data ?? [])
  const sorted = sortChallenges(challenges)

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/client/gamificacion"
              className="text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              ← Gamificación
            </Link>
          </div>
          <h1 className="text-2xl font-black text-[var(--color-foreground)]">⚔️ Retos</h1>
        </div>

        <Link
          href="/client/gamificacion/retos/nuevo"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-client)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Crear reto
        </Link>
      </div>

      {/* Error notice */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
          No se pudieron cargar los retos: {(error as any).message ?? 'Error desconocido'}
        </div>
      )}

      {/* Challenge list */}
      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      ) : (
        !error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 py-16 text-center">
            <span className="text-4xl">⚔️</span>
            <p className="mt-4 text-base font-semibold text-[var(--color-foreground)]">
              No hay retos activos
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              ¡Crea el primero!
            </p>
            <Link
              href="/client/gamificacion/retos/nuevo"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-client)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Crear reto
            </Link>
          </div>
        )
      )}
    </div>
  )
}
