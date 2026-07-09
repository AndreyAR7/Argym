'use client'

import { useState } from 'react'
import { createBillingPortalSessionAction } from './actions'
import { ExternalLink, Loader2 } from 'lucide-react'

export function BillingPortalButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const result = await createBillingPortalSessionAction()
    if (result.url) {
      window.location.href = result.url
    } else {
      setError(result.error ?? 'No se pudo abrir el portal. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--color-client)' }}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Abriendo portal…
          </>
        ) : (
          <>
            <ExternalLink size={14} />
            Ir al portal de facturación
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
