import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server-admin'
import Stripe from 'stripe'

export const runtime = 'nodejs'

// ── Edge Function notifier (internal path A with webhook secret) ──────────────
async function notifyEdgeFunction(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  eventType: string,
  tenantId: string,
  subscriptionId: string,
) {
  const { data: secret } = await supabase.rpc('get_webhook_secret')
  if (!secret) return

  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-communication`
  await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': secret as string,
    },
    body: JSON.stringify({ event_type: eventType, tenant_id: tenantId, subscription_id: subscriptionId }),
  }).catch((err) => console.error('[webhook] edge-function notify error:', err))
}

// ── Lookup our subscription by Stripe subscription ID ────────────────────────
async function findSubByStripeId(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  stripeSubId: string,
) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('id, tenant_id')
    .eq('stripe_subscription_id', stripeSubId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || !sig) {
    console.error('[webhook] Missing STRIPE_WEBHOOK_SECRET or stripe-signature header')
    return NextResponse.json({ error: 'Webhook signature required' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  try {
    switch (event.type) {

      // ── First payment: create subscription record ───────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata ?? {}
        const { user_id, tenant_id, plan_id, promotion_id, final_price, billing_cycle } = meta

        if (!user_id || !tenant_id || !plan_id) {
          console.error('[webhook] Missing metadata in session:', session.id)
          break
        }

        const { data: subId, error } = await supabase.rpc('create_client_subscription', {
          p_user_id:       user_id,
          p_tenant_id:     tenant_id,
          p_plan_id:       plan_id,
          p_promotion_id:  promotion_id || null,
          p_final_price:   parseFloat(final_price ?? '0'),
          p_payment_ref:   session.id,
          p_billing_cycle: billing_cycle ?? 'one_time',
        })

        if (error) {
          console.error('[webhook] create_client_subscription error:', error)
          // Return 500 so Stripe retries — success page is the fallback
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Save stripe_subscription_id for future renewal/cancellation events
        if (subId && session.subscription) {
          await supabase
            .from('user_subscriptions')
            .update({ stripe_subscription_id: session.subscription as string })
            .eq('id', subId as string)
        }

        console.log('[webhook] Subscription created for user', user_id, 'sub', subId)
        break
      }

      // ── Recurring renewal: extend end_date ─────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId = (invoice as any).subscription as string | null

        // Skip the first invoice — it's already handled by checkout.session.completed
        if (!stripeSubId || (invoice as any).billing_reason === 'subscription_create') break

        const amountPaid = (invoice.amount_paid ?? 0) / 100
        const payRef     = invoice.id

        const { data: subId, error } = await supabase.rpc('renew_client_subscription', {
          p_stripe_subscription_id: stripeSubId,
          p_payment_ref:            payRef,
          p_final_price:            amountPaid,
        })

        if (error) {
          console.error('[webhook] renew_client_subscription error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!subId) {
          // No matching subscription — could be a test event or orphaned Stripe subscription
          console.warn('[webhook] No subscription found for Stripe sub:', stripeSubId)
          break
        }

        console.log('[webhook] Subscription renewed, sub', subId, 'invoice', payRef)
        break
      }

      // ── Payment failed: notify client via email ─────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeSubId = (invoice as any).subscription as string | null
        if (!stripeSubId) break

        const localSub = await findSubByStripeId(supabase, stripeSubId)
        if (!localSub) {
          console.warn('[webhook] No subscription found for failed invoice, Stripe sub:', stripeSubId)
          break
        }

        await notifyEdgeFunction(supabase, 'payment.failed', localSub.tenant_id, localSub.id)
        console.log('[webhook] payment.failed notification sent for sub', localSub.id)
        break
      }

      // ── Subscription deleted: cancel access ────────────────────────────────
      // Fired when: user cancels, dunning retries exhausted, or admin cancels from Stripe dashboard.
      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription
        const stripeSubId = stripeSub.id

        // Look up before cancelling (cancel_client_subscription returns the sub UUID)
        const localSub = await findSubByStripeId(supabase, stripeSubId)

        const { data: subId, error } = await supabase.rpc('cancel_client_subscription', {
          p_stripe_subscription_id: stripeSubId,
        })

        if (error) {
          console.error('[webhook] cancel_client_subscription error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (subId && localSub) {
          await notifyEdgeFunction(supabase, 'subscription.cancelled', localSub.tenant_id, subId as string)
        }

        console.log('[webhook] Subscription cancelled, sub', subId)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[webhook] Unhandled error processing event:', event.type, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
