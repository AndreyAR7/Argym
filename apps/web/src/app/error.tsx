'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
    // Sentry's Next.js SDK auto-instruments unhandled errors, but does NOT
    // auto-capture errors that reach an error.tsx/global-error.tsx boundary
    // — those have to be reported explicitly, or they only ever show up in
    // this console.error and never in Sentry.
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-[var(--color-background)]">
      <p className="text-6xl font-bold text-[var(--color-border)]">500</p>
      <h1 className="text-lg font-semibold text-[var(--color-foreground)]">
        Algo salió mal
      </h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Ocurrió un error inesperado. Por favor intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
