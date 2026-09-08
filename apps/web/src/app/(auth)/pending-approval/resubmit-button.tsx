'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resubmitRegistrationAction } from '@/lib/auth/actions'

export function ResubmitButton() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await resubmitRegistrationAction()
      if (result?.error) {
        setError(result.error)
      } else {
        setDone(true)
        router.refresh()
      }
    })
  }

  if (done) {
    return (
      <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
        Solicitud enviada de nuevo. El administrador la revisará.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-[var(--color-destructive)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Enviando…' : 'Solicitar revisión de nuevo'}
      </button>
    </div>
  )
}
