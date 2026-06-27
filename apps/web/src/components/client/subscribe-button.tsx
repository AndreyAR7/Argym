'use client'

import { useState, useTransition } from 'react'

interface Props {
  planId: string
  promotionId?: string | null
  finalPrice: number
  planName: string
  currency: string
}

export function SubscribeButton({ planId, promotionId, finalPrice, planName, currency }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, promotionId: promotionId ?? null }),
        })
        const data = await res.json()
        if (data.error) { setError(data.error); return }
        if (data.url) window.location.href = data.url
      } catch {
        setError('Error al iniciar el pago. Intenta de nuevo.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCheckout}
        disabled={isPending}
        className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-client)', color: 'white' }}>
        {isPending ? 'Redirigiendo a pago…' : `Suscribirse · ${currency} ${finalPrice.toLocaleString('es-CR')}`}
      </button>
      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--color-destructive)' }}>{error}</p>
      )}
    </div>
  )
}
