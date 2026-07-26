'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
    // Same gap as app/error.tsx: this boundary catches errors Sentry's
    // auto-instrumentation never sees on its own.
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1.5rem',
            fontFamily: 'system-ui, sans-serif',
            background: '#0d1b2a',
            color: '#f8fafc',
          }}
        >
          <p style={{ fontSize: '4rem', fontWeight: 700, color: '#334155', lineHeight: 1 }}>
            500
          </p>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            Error crítico de la aplicación
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
            Ocurrió un error en la carga principal de la plataforma.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '0.5rem',
              borderRadius: '0.5rem',
              background: '#6C63FF',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
