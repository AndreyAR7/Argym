'use client'

import { useTransition, useState } from 'react'
import { checkinAction } from './actions'
import type { CheckinResult } from './actions'

interface CheckinButtonProps {
  userId: string
  tenantId: string
  alreadyCheckedIn: boolean
}

export function CheckinButton({ alreadyCheckedIn }: CheckinButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Derive the completed state from either the prop (SSR) or a successful action result
  const isCompleted =
    alreadyCheckedIn ||
    result?.already_checked_in === true ||
    (result?.success === true && result?.xp_earned !== undefined)

  function handleCheckin() {
    setError(null)
    startTransition(async () => {
      const res = await checkinAction()
      if (!res.success && !res.already_checked_in) {
        setError(res.error ?? 'Error al registrar check-in')
      } else {
        setResult(res)
      }
    })
  }

  // ── Completed state ──────────────────────────────────────────────────────
  if (isCompleted) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-5 py-2.5 text-emerald-600 dark:text-emerald-400">
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-sm font-semibold">Check-in completado hoy</span>
        </div>

        {/* Show XP / streak earned from this session's action (not the SSR prop) */}
        {result?.success && result.xp_earned !== undefined && (
          <p className="animate-in fade-in slide-in-from-bottom-2 duration-500 text-sm text-[var(--color-muted-foreground)]">
            <span className="font-semibold text-[var(--color-client)]">
              +{result.xp_earned} XP
            </span>{' '}
            ganado
            {result.new_streak !== undefined && (
              <>
                {' · '}
                <span className="font-semibold">Racha: {result.new_streak} días 🔥</span>
              </>
            )}
          </p>
        )}

        {/* New badges earned */}
        {result?.new_badges && result.new_badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {result.new_badges.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)]"
              >
                <span>{b.icon}</span>
                {b.name}
              </span>
            ))}
          </div>
        )}

        {/* Level-up message */}
        {result?.new_level != null && (
          <p className="animate-in fade-in zoom-in-95 duration-700 rounded-full bg-[var(--color-client)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--color-client)]">
            🎉 ¡Subiste al nivel {result.new_level}!
          </p>
        )}
      </div>
    )
  }

  // ── Action button ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleCheckin}
        disabled={isPending}
        className="relative inline-flex min-w-[220px] items-center justify-center gap-2.5 rounded-xl bg-[var(--color-client)] px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            {/* Spinner */}
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Registrando…
          </>
        ) : (
          <>
            <span className="text-lg leading-none">📍</span>
            Hacer Check-in
          </>
        )}
      </button>

      {error && (
        <p className="rounded-md bg-[var(--color-destructive)]/10 px-4 py-2 text-sm font-medium text-[var(--color-destructive)]">
          {error}
        </p>
      )}
    </div>
  )
}
