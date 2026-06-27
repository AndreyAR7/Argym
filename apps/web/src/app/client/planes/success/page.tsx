'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export default function SubscriptionSuccessPage() {
  const router = useRouter()
  useEffect(() => {
    const t = setTimeout(() => router.push('/client/subscription'), 4000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-client) 12%, transparent)' }}>
        <CheckCircle2 size={40} style={{ color: 'var(--color-client)' }} />
      </div>
      <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
        ¡Suscripción activada!
      </h1>
      <p className="text-sm mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
        Tu pago fue procesado exitosamente.
      </p>
      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
        Redirigiendo a tu suscripción…
      </p>
    </div>
  )
}
