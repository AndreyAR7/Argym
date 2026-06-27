import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server-admin'
import Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: unknown) {
      console.error('[webhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  } else {
    // In dev without webhook secret, parse directly (NOT for production)
    try {
      event = JSON.parse(body) as Stripe.Event
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata ?? {}
    const { user_id, tenant_id, plan_id, promotion_id, final_price, billing_cycle } = meta

    if (!user_id || !tenant_id || !plan_id) {
      console.error('[webhook] Missing metadata in session:', session.id)
      return NextResponse.json({ received: true })
    }

    try {
      const supabase = await createAdminClient()
      const { error } = await supabase.rpc('create_client_subscription', {
        p_user_id:       user_id,
        p_tenant_id:     tenant_id,
        p_plan_id:       plan_id,
        p_promotion_id:  promotion_id || null,
        p_final_price:   parseFloat(final_price ?? '0'),
        p_payment_ref:   session.id,
        p_billing_cycle: billing_cycle ?? 'one_time',
      })
      if (error) console.error('[webhook] create_client_subscription error:', error)
      else console.log('[webhook] Subscription created for user', user_id)
    } catch (err) {
      console.error('[webhook] Error creating subscription:', err)
    }
  }

  return NextResponse.json({ received: true })
}
