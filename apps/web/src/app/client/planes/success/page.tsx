import Link from 'next/link'
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export const metadata = { title: 'Pago exitoso' }

type ActivationResult =
  | { ok: true }
  | { ok: false; reason: string }

async function activateSubscription(sessionId: string): Promise<ActivationResult> {
  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    console.log('[success] session status:', session.status, 'payment_status:', session.payment_status)

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      const reason = `Pago no completado (status: ${session.status}, payment_status: ${session.payment_status})`
      console.error('[success]', reason)
      return { ok: false, reason }
    }

    const meta = session.metadata ?? {}
    const { user_id, tenant_id, plan_id, promotion_id, final_price, billing_cycle } = meta

    if (!user_id || !tenant_id || !plan_id) {
      const reason = `Metadatos incompletos en la sesión de Stripe: ${JSON.stringify(meta)}`
      console.error('[success]', reason)
      return { ok: false, reason }
    }

    const supabase = await createClient()

    // Check if subscription already exists (webhook may have already created it)
    const { data: existing, error: lookupErr } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('payment_reference', sessionId)
      .maybeSingle()

    if (lookupErr) {
      console.error('[success] lookup error:', lookupErr)
      return { ok: false, reason: `Error al verificar suscripción: ${lookupErr.message}` }
    }

    if (existing) {
      console.log('[success] subscription already exists, created by webhook:', existing.id)
      return { ok: true }
    }

    // Fallback: create subscription (webhook didn't fire or was delayed)
    const { error } = await supabase.rpc('create_client_subscription', {
      p_user_id:       user_id,
      p_tenant_id:     tenant_id,
      p_plan_id:       plan_id,
      p_promotion_id:  promotion_id || null,
      p_final_price:   parseFloat(final_price ?? '0'),
      p_payment_ref:   sessionId,
      p_billing_cycle: billing_cycle ?? 'one_time',
    })

    if (error) {
      console.error('[success] create_client_subscription error:', error)
      return { ok: false, reason: `Error al activar suscripción: ${error.message}` }
    }

    console.log('[success] subscription created via fallback for session:', sessionId)
    return { ok: true }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[success] unexpected error:', msg)
    return { ok: false, reason: `Error inesperado: ${msg}` }
  }
}

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  let result: ActivationResult = { ok: true }

  if (session_id) {
    result = await activateSubscription(session_id)
  } else {
    result = { ok: false, reason: 'No se recibió el ID de sesión de Stripe.' }
  }

  if (!result.ok) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 12%, transparent)' }}
        >
          <AlertCircle size={40} style={{ color: 'var(--color-destructive)' }} />
        </div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
          Pago recibido, pero hubo un problema al activar tu plan
        </h1>
        <p className="text-sm mb-2 max-w-md" style={{ color: 'var(--color-muted-foreground)' }}>
          Tu pago fue procesado por Stripe, pero no pudimos registrar tu suscripción automáticamente.
          Esto se resuelve solo en unos minutos vía nuestro sistema de verificación.
        </p>
        <p className="text-xs mb-6 max-w-sm px-3 py-2 rounded-lg font-mono" style={{
          backgroundColor: 'var(--color-muted)',
          color: 'var(--color-muted-foreground)',
        }}>
          {result.reason}
        </p>
        <div className="flex gap-3">
          <Link
            href={session_id ? `/client/planes/success?session_id=${session_id}` : '/client/planes/success'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-client)' }}
          >
            <RefreshCw size={14} />
            Reintentar
          </Link>
          <Link
            href="/client/subscription"
            className="px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            Ver mi suscripción
          </Link>
        </div>
      </div>
    )
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
        Tu pago fue procesado exitosamente. Ya puedes acceder a todos los beneficios de tu plan.
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
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          Volver a planes
        </Link>
      </div>
    </div>
  )
}
