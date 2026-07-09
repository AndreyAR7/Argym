import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server-admin'
import Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET

  if (!webhookSecret || !sig) {
    console.error('[platform-webhook] Missing STRIPE_PLATFORM_WEBHOOK_SECRET or stripe-signature')
    return NextResponse.json({ error: 'Webhook signature required' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[platform-webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  try {
    switch (event.type) {

      // ── First subscription created ─────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta    = session.metadata ?? {}

        if (meta.type !== 'platform') break

        const { tenant_id, plan_id } = meta
        if (!tenant_id || !plan_id) {
          console.error('[platform-webhook] Missing metadata in platform checkout session', session.id)
          break
        }

        const stripeCustomerId = session.customer as string
        const stripeSub        = await getStripe().subscriptions.retrieve(session.subscription as string)

        const { error } = await supabase.rpc('upsert_platform_subscription', {
          p_tenant_id:          tenant_id,
          p_plan_id:            plan_id,
          p_stripe_customer_id: stripeCustomerId,
          p_stripe_sub_id:      stripeSub.id,
          p_billing_cycle:      stripeSub.items.data[0]?.price?.recurring?.interval ?? 'month',
          p_period_start:       new Date((stripeSub as any).current_period_start * 1000).toISOString(),
          p_period_end:         new Date((stripeSub as any).current_period_end   * 1000).toISOString(),
        })

        if (error) {
          console.error('[platform-webhook] upsert_platform_subscription error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log('[platform-webhook] Platform subscription created for tenant', tenant_id)
        break
      }

      // ── Subscription renewed ───────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice      = event.data.object as Stripe.Invoice
        const stripeSubId  = (invoice as any).subscription as string | null
        const billingReason = (invoice as any).billing_reason as string

        if (!stripeSubId || billingReason === 'subscription_create') break

        // Only handle platform subscriptions
        const { data: sub } = await supabase
          .from('tenant_subscriptions')
          .select('id')
          .eq('stripe_sub_id', stripeSubId)
          .maybeSingle()

        if (!sub) break

        const stripeSub = await getStripe().subscriptions.retrieve(stripeSubId)

        const { error } = await supabase.rpc('renew_platform_subscription', {
          p_stripe_sub_id: stripeSubId,
          p_period_start:  new Date((stripeSub as any).current_period_start * 1000).toISOString(),
          p_period_end:    new Date((stripeSub as any).current_period_end   * 1000).toISOString(),
        })

        if (error) {
          console.error('[platform-webhook] renew_platform_subscription error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log('[platform-webhook] Platform subscription renewed for Stripe sub', stripeSubId)
        break
      }

      // ── Payment failed → suspend tenant ────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice     = event.data.object as Stripe.Invoice
        const stripeSubId = (invoice as any).subscription as string | null
        if (!stripeSubId) break

        const { data: sub } = await supabase
          .from('tenant_subscriptions')
          .select('id, tenant_id')
          .eq('stripe_sub_id', stripeSubId)
          .maybeSingle()

        if (!sub) break

        // Grace period: Stripe retries 3 times; only suspend after final failure
        const attemptCount = (invoice as any).attempt_count as number ?? 1
        if (attemptCount >= 3) {
          await supabase.rpc('suspend_platform_subscription', { p_stripe_sub_id: stripeSubId })
          console.log('[platform-webhook] Tenant suspended after payment failures, tenant', sub.tenant_id)
        }
        break
      }

      // ── Subscription deleted → suspend ─────────────────────────────────────
      case 'customer.subscription.deleted': {
        const stripeSub   = event.data.object as Stripe.Subscription
        const stripeSubId = stripeSub.id

        const { data: subId, error } = await supabase.rpc('cancel_platform_subscription', {
          p_stripe_sub_id: stripeSubId,
        })

        if (error) {
          console.error('[platform-webhook] cancel_platform_subscription error:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log('[platform-webhook] Platform subscription cancelled, sub', subId)
        break
      }

      // ── Trial ending reminder ──────────────────────────────────────────────
      case 'customer.subscription.trial_will_end': {
        const stripeSub = event.data.object as Stripe.Subscription
        console.log('[platform-webhook] Trial ending soon for Stripe sub', stripeSub.id)
        // TODO: send warning email to gym owner via send-communication
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[platform-webhook] Unhandled error processing event:', event.type, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
