import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getStripe } from '@/lib/stripe'

export const metadata = { title: 'Pago exitoso' }

async function activateSubscriptionFallback(sessionId: string) {
  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid' && session.status !== 'complete') return

    const meta = session.metadata ?? {}
    const { user_id, tenant_id, plan_id, promotion_id, final_price, billing_cycle } = meta
    if (!user_id || !tenant_id || !plan_id) return

    const supabase = await createAdminClient()

    // Check if webhook already created the subscription
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('payment_reference', sessionId)
      .maybeSingle()

    if (existing) return

    // Fallback: create subscription in case webhook didn't fire
    const { error } = await supabase.rpc('create_client_subscription', {
      p_user_id:       user_id,
      p_tenant_id:     tenant_id,
      p_plan_id:       plan_id,
      p_promotion_id:  promotion_id || null,
      p_final_price:   parseFloat(final_price ?? '0'),
      p_payment_ref:   sessionId,
      p_billing_cycle: billing_cycle ?? 'one_time',
    })

    if (error) console.error('[success] Fallback activation error:', error)
  } catch (err) {
    console.error('[success] Failed to activate subscription:', err)
  }
}

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (session_id) {
    await activateSubscriptionFallback(session_id)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-client) 12%, transparent)' }}
      >
        <CheckCircle2 size={40} style={{ color: 'var(--color-client)' }} />
      </div>
      <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
        ¡Suscripción activada!
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>
        Tu pago fue procesado exitosamente.
      </p>
      <div className="flex gap-3">
        <Link
          href="/client/subscription"
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-client)' }}
        >
          Ver mi suscripción
        </Link>
        <Link
          href="/client/planes"
          className="px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-foreground)',
            backgroundColor: 'var(--color-muted)',
          }}
        >
          Volver a planes
        </Link>
      </div>
    </div>
  )
}
