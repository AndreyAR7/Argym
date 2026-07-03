import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { getUserUnlocks } from '@/lib/gamification/get-user-unlocks'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { ChallengeActions } from './challenge-actions'

export const metadata = { title: 'Retos' }

// ─── Types ────────────────────────────────────────────────────────────────────

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
  creator_id: string
  participant_count: number
  my_status: 'pending' | 'accepted' | 'completed' | string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: Challenge['challenge_type'] }) {
  const map: Record<string, { label: string; className: string }> = {
    global: { label: '🌍 Global', className: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' },
    '1v1':  { label: '⚔️ 1 vs 1', className: 'bg-purple-500/10 text-purple-600 border border-purple-500/20' },
    group:  { label: '👥 Grupo',  className: 'bg-orange-500/10 text-orange-600 border border-orange-500/20' },
  }
  const cfg = map[type] ?? { label: type, className: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function StatusPill({ myStatus }: { myStatus: string }) {
  if (myStatus === 'pending')   return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 border border-amber-500/20">Invitación</span>
  if (myStatus === 'accepted')  return <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-500/20">En curso</span>
  if (myStatus === 'completed') return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-500/20">Completado ✓</span>
  if (myStatus === 'declined')  return <span className="inline-flex items-center rounded-full bg-[var(--color-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-muted-foreground)]">Rechazado</span>
  return <span className="inline-flex items-center rounded-full bg-[var(--color-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">{myStatus}</span>
}

function ChallengeCard({
  challenge,
  userId,
  opponentName,
}: {
  challenge: Challenge
  userId: string
  opponentName: string | null
}) {
  const isPendingInvite = challenge.my_status === 'pending'
  const isMine          = challenge.creator_id === userId
  const expiryStr       = formatDate(challenge.expires_at)

  return (
    <div
      className={[
        'rounded-xl border bg-[var(--color-card)] p-4 space-y-3 transition-shadow hover:shadow-sm',
        isPendingInvite
          ? 'border-amber-300/60 ring-1 ring-amber-300/30'
          : 'border-[var(--color-border)]',
      ].join(' ')}
    >
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={challenge.challenge_type} />
        <StatusPill myStatus={challenge.my_status} />
      </div>

      {/* Title + description */}
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

      {/* 1v1 opponent banner */}
      {challenge.challenge_type === '1v1' && (
        <div className="flex items-center gap-3 rounded-lg bg-[var(--color-muted)]/50 px-3 py-2">
          {/* Me */}
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
              style={{ backgroundColor: 'var(--color-client-light)', color: 'var(--color-client)' }}>
              Tú
            </div>
          </div>
          <span className="text-base font-black text-[var(--color-muted-foreground)]">VS</span>
          {/* Opponent */}
          {opponentName ? (
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black bg-purple-100 text-purple-600">
                {initials(opponentName)}
              </div>
              <span className="text-sm font-semibold text-[var(--color-foreground)]">{opponentName}</span>
            </div>
          ) : (
            <span className="text-sm text-[var(--color-muted-foreground)] italic">
              {isMine ? 'Esperando respuesta…' : challenge.creator_name ?? 'Desconocido'}
            </span>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
        <span className="font-semibold text-[var(--color-client)]">⚡ {challenge.xp_reward} XP</span>
        {challenge.challenge_type !== '1v1' && (
          <span>👥 {challenge.participant_count} participante{challenge.participant_count !== 1 ? 's' : ''}</span>
        )}
        {expiryStr && <span>Vence {expiryStr}</span>}
        {challenge.challenge_type !== '1v1' && challenge.creator_name && (
          <span>Creado por {challenge.creator_name}</span>
        )}
      </div>

      {/* Actions */}
      <ChallengeActions
        challengeId={challenge.id}
        myStatus={challenge.my_status}
        xpReward={challenge.xp_reward}
      />
    </div>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </h2>
      <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--color-muted-foreground)]">
        {count}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RetosPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')

  const { supabase, tenantId, user } = session
  const userId = user.id

  const [{ data, error }, unlocks] = await Promise.all([
    supabase.rpc('get_user_challenges', {
      p_user_id:   userId,
      p_tenant_id: tenantId,
    }),
    getUserUnlocks(userId),
  ])

  const canCreateChallenges = unlocks.can_create_challenges
  const challenges: Challenge[] = error ? [] : ((data ?? []) as Challenge[])

  // ── Fetch opponent names for 1v1 challenges ──────────────────────────────
  const oneVsOneIds = challenges.filter(c => c.challenge_type === '1v1').map(c => c.id)
  const opponentMap: Record<string, string> = {}

  if (oneVsOneIds.length > 0) {
    const adminClient = await createAdminClient()
    const { data: participants } = await adminClient
      .from('challenge_participants')
      .select('challenge_id, user_id, status')
      .in('challenge_id', oneVsOneIds)
      .neq('user_id', userId)
      .not('status', 'eq', 'declined')

    const opponentIds = (participants ?? []).map(p => p.user_id as string)

    if (opponentIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', opponentIds)

      const profileMap = Object.fromEntries(
        (profiles ?? []).map(p => [p.user_id as string, (p.full_name as string) ?? 'Desconocido']),
      )
      for (const p of participants ?? []) {
        opponentMap[p.challenge_id as string] = profileMap[p.user_id as string] ?? 'Esperando…'
      }
    }
  }

  // ── Segment into sections ────────────────────────────────────────────────
  const invitations = challenges.filter(c => c.my_status === 'pending')
  const active      = challenges.filter(c => c.my_status === 'accepted')
  const completed   = challenges.filter(c => c.my_status === 'completed')
  const total       = challenges.length

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/client/gamificacion"
            className="text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            ← Gamificación
          </Link>
          <h1 className="mt-1 text-2xl font-black text-[var(--color-foreground)]">⚔️ Retos</h1>
        </div>

        {canCreateChallenges ? (
          <Link
            href="/client/gamificacion/retos/nuevo"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-client)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Crear reto
          </Link>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-4 py-2.5 text-sm font-semibold text-[var(--color-muted-foreground)] cursor-not-allowed select-none">
            🔒 Nivel 5 requerido
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar los retos: {(error as { message?: string }).message ?? 'Error desconocido'}
        </div>
      )}

      {/* Empty */}
      {!error && total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 py-16 text-center">
          <span className="text-4xl">⚔️</span>
          <p className="mt-4 text-base font-semibold text-[var(--color-foreground)]">No hay retos activos</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {canCreateChallenges ? '¡Crea el primero y reta a alguien!' : 'Alcanza el Nivel 5 para crear retos.'}
          </p>
          {canCreateChallenges ? (
            <Link
              href="/client/gamificacion/retos/nuevo"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--color-client)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Crear reto
            </Link>
          ) : (
            <Link
              href="/client/gamificacion"
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/50 px-5 py-2.5 text-sm font-semibold text-[var(--color-muted-foreground)] transition-all hover:bg-[var(--color-muted)] active:scale-95"
            >
              Ver mi progreso →
            </Link>
          )}
        </div>
      )}

      {/* ── Invitations ── */}
      {invitations.length > 0 && (
        <section className="space-y-3">
          <SectionHeader label="Invitaciones pendientes" count={invitations.length} />
          {invitations.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              userId={userId}
              opponentName={opponentMap[c.id] ?? null}
            />
          ))}
        </section>
      )}

      {/* ── Active challenges ── */}
      {active.length > 0 && (
        <section className="space-y-3">
          <SectionHeader label="En curso" count={active.length} />
          {active.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              userId={userId}
              opponentName={opponentMap[c.id] ?? null}
            />
          ))}
        </section>
      )}

      {/* ── Completed ── */}
      {completed.length > 0 && (
        <section className="space-y-3">
          <SectionHeader label="Completados" count={completed.length} />
          {completed.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              userId={userId}
              opponentName={opponentMap[c.id] ?? null}
            />
          ))}
        </section>
      )}

    </div>
  )
}
