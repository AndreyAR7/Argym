'use client'

import { useState, useTransition } from 'react'
import { deactivateChallengeAction } from './actions'
import { PowerOff } from 'lucide-react'

interface DeactivateChallengeButtonProps {
  challengeId: string
}

export function DeactivateChallengeButton({ challengeId }: DeactivateChallengeButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (isPending) return
    startTransition(async () => {
      const result = await deactivateChallengeAction(challengeId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className="text-xs text-red-600 max-w-[120px] truncate" title={error}>
          {error}
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        title="Desactivar reto"
      >
        <PowerOff size={11} />
        {isPending ? 'Desactivando…' : 'Desactivar'}
      </button>
    </div>
  )
}
