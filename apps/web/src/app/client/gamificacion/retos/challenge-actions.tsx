'use client'

import { useTransition, useState } from 'react'
import {
  acceptChallengeAction,
  declineChallengeAction,
  completeChallengeAction,
} from '../actions'

interface ChallengeActionsProps {
  challengeId: string
  myStatus: string
  xpReward: number
}

type Result = 'accepted' | 'declined' | 'completed' | null

export function ChallengeActions({ challengeId, myStatus, xpReward }: ChallengeActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<Result>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Already completed (from prop) ────────────────────────────────────────
  if (myStatus === 'completed' && result === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Completado
      </span>
    )
  }

  // ── Post-action feedback ──────────────────────────────────────────────────
  if (result === 'accepted') {
    return (
      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
        ✓ Reto aceptado — ¡buena suerte!
      </p>
    )
  }

  if (result === 'declined') {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Reto rechazado
      </p>
    )
  }

  if (result === 'completed') {
    return (
      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-bottom-1 duration-400">
        +{xpReward} XP ganados 🎉
      </p>
    )
  }

  // ── Pending invitation ────────────────────────────────────────────────────
  if (myStatus === 'pending') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const res = await acceptChallengeAction(challengeId)
                if (!res.success) {
                  setError(res.error ?? 'Error al aceptar el reto')
                } else {
                  setResult('accepted')
                }
              })
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-client)] px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Spinner />
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Aceptar
              </>
            )}
          </button>

          <button
            disabled={isPending}
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const res = await declineChallengeAction(challengeId)
                if (!res.success) {
                  setError(res.error ?? 'Error al rechazar el reto')
                } else {
                  setResult('declined')
                }
              })
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3.5 py-1.5 text-sm font-semibold text-[var(--color-muted-foreground)] transition-all hover:opacity-80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rechazar
          </button>
        </div>

        {error && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }

  // ── Accepted — mark as completed ─────────────────────────────────────────
  if (myStatus === 'accepted') {
    return (
      <div className="flex flex-col gap-2">
        <button
          disabled={isPending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const res = await completeChallengeAction(challengeId)
              if (!res.success) {
                setError(res.error ?? 'Error al completar el reto')
              } else {
                setResult('completed')
              }
            })
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-semibold text-[var(--color-foreground)] transition-all hover:bg-[var(--color-muted)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Spinner />
          ) : (
            <>
              <span>🏁</span>
              Marcar como completado
            </>
          )}
        </button>

        {error && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }

  return null
}

// ── Inline spinner ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
