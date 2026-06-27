import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { planId, promotionId } = await req.json()
    if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch plan details
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('id, name, description, price, currency, billing_cycle, tenant_id')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planErr || !plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    // Fetch promotion if provided
    let finalPrice: number = Number(plan.price)
    let appliedPromoId: string | null = null

    if (promotionId) {
      const { data: promo } = await supabase
        .from('promotions')
        .select('id, discount_percentage, discount_amount, applies_to_plan_id')
        .eq('id', promotionId)
        .eq('is_active', true)
        .single()

      if (promo && (!promo.applies_to_plan_id || promo.applies_to_plan_id === planId)) {
        if (promo.discount_percentage) {
          finalPrice = finalPrice * (1 - Number(promo.discount_percentage) / 100)
        } else if (promo.discount_amount) {
          finalPrice = Math.max(0, finalPrice - Number(promo.discount_amount))
        }
        appliedPromoId = promo.id
      }
    }

    // Convert to cents (Stripe uses smallest currency unit)
    // CRC → colones (no cents, multiply by 100)
    const unitAmount = Math.round(finalPrice * 100)

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single()

    let customerId: string | undefined = profile?.stripe_customer_id ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id, tenant_id: plan.tenant_id },
      })
      customerId = customer.id
      // Save customer ID (best effort — don't fail if this errors)
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id)
    }

    const baseUrl = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: plan.currency.toLowerCase(),
          product_data: {
            name: plan.name,
            description: plan.description ?? undefined,
          },
          unit_amount: unitAmount,
          // For recurring plans, use recurring; for one_time, omit
          ...(plan.billing_cycle !== 'one_time' ? {
            recurring: {
              interval: plan.billing_cycle === 'monthly' ? 'month' : 'year',
            }
          } : {}),
        },
        quantity: 1,
      }],
      mode: plan.billing_cycle === 'one_time' ? 'payment' : 'subscription',
      success_url: baseUrl + '/client/planes/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: baseUrl + '/client/planes',
      metadata: {
        user_id: user.id,
        tenant_id: plan.tenant_id,
        plan_id: planId,
        promotion_id: appliedPromoId ?? '',
        final_price: String(finalPrice),
        billing_cycle: plan.billing_cycle,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('[stripe/checkout]', err)
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
