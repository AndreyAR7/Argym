import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

export interface UnassignResult {
  error?: string
  success?: true
  refunded?: boolean
  refundAmount?: number
  refundError?: string
}

// Shared by the web server action and the mobile-facing API route so the
// Stripe logic (only web holds STRIPE_SECRET_KEY) lives in exactly one
// place. Resolves whether the subscription was actually paid via Stripe —
// payment_reference is a Checkout Session id (cs_...) from the original
// purchase, or a Stripe Invoice id (in_...) after a renewal (see
// 20240101000032/20240101000091) — and if so, refunds the underlying
// payment_intent and cancels the recurring Stripe subscription so it
// doesn't try to bill again. A manually-assigned plan (no payment_reference)
// is just cancelled in the DB; any refund for that case is handled by staff
// outside the app, per how the client actually paid (cash, transfer, etc.).
export async function unassignSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  reason: string | undefined,
): Promise<UnassignResult> {
  const { data: sub, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('id, status, final_price, payment_reference, stripe_subscription_id')
    .eq('id', subscriptionId)
    .single()

  if (fetchError || !sub) return { error: 'Suscripción no encontrada' }
  if (sub.status !== 'active') return { error: 'Esta suscripción ya no está activa' }

  let refunded = false
  let refundAmount: number | undefined
  let refundError: string | undefined

  const paymentRef = sub.payment_reference as string | null

  if (paymentRef) {
    try {
      const stripe = getStripe()
      let paymentIntentId: string | null = null

      if (paymentRef.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(paymentRef)
        paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null
      } else if (paymentRef.startsWith('in_')) {
        const invoice = await stripe.invoices.retrieve(paymentRef)
        const pi = (invoice as unknown as { payment_intent: string | { id: string } | null }).payment_intent
        paymentIntentId = typeof pi === 'string' ? pi : pi?.id ?? null
      }

      if (paymentIntentId) {
        const refund = await stripe.refunds.create({ payment_intent: paymentIntentId })
        refunded = true
        refundAmount = refund.amount / 100
      }
    } catch (err) {
      refundError = err instanceof Error ? err.message : 'Error al procesar el reembolso en Stripe'
    }

    // Stop future recurring charges regardless of whether the one-time
    // refund above succeeded — a mistaken assignment shouldn't keep billing.
    if (sub.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.cancel(sub.stripe_subscription_id)
      } catch {
        // Already cancelled/doesn't exist — not fatal to the unassign flow.
      }
    }
  }

  const { error: cancelError } = await supabase.rpc('cancel_subscription', {
    p_subscription_id: subscriptionId,
    p_reason: reason || 'Revertido por administrador',
  })
  if (cancelError) return { error: cancelError.message }

  const refundStatus = refundError ? 'failed' : refunded ? 'refunded' : 'none'
  if (refundStatus !== 'none') {
    await supabase.rpc('record_subscription_refund', {
      p_subscription_id: subscriptionId,
      p_refund_id: null,
      p_amount: refundAmount ?? null,
      p_status: refundStatus,
    })
  }

  return { success: true, refunded, refundAmount, refundError }
}
