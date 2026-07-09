import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getSessionData } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionData()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { planId, tenantId, successUrl, cancelUrl } = await req.json()
    if (!planId || !tenantId) {
      return NextResponse.json({ error: 'planId and tenantId are required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Load platform plan + existing tenant Stripe customer
    const [planRes, tenantRes, subRes] = await Promise.all([
      supabase
        .from('subscription_plans')
        .select('id, name, stripe_price_id, billing_cycle, trial_days')
        .eq('id', planId)
        .eq('is_platform_plan', true)
        .single(),
      supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('id', tenantId)
        .single(),
      supabase
        .from('tenant_subscriptions')
        .select('stripe_customer_id')
        .eq('tenant_id', tenantId)
        .maybeSingle(),
    ])

    if (planRes.error || !planRes.data?.stripe_price_id) {
      return NextResponse.json({ error: 'Platform plan not found or missing Stripe price' }, { status: 404 })
    }
    if (tenantRes.error) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const stripe = getStripe()
    const plan   = planRes.data
    const tenant = tenantRes.data
    let stripeCustomerId = subRes.data?.stripe_customer_id ?? null

    // Create Stripe customer if not yet linked
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name:     tenant.name,
        metadata: { tenant_id: tenantId, tenant_slug: tenant.slug },
      })
      stripeCustomerId = customer.id
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer:   stripeCustomerId,
      mode:       'subscription',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      ...(plan.trial_days > 0 ? { subscription_data: { trial_period_days: plan.trial_days } } : {}),
      metadata: {
        type:      'platform',
        tenant_id: tenantId,
        plan_id:   planId,
      },
      success_url: successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/super-admin/tenants/${tenantId}?success=1`,
      cancel_url:  cancelUrl  ?? `${process.env.NEXT_PUBLIC_APP_URL}/super-admin/tenants/${tenantId}?cancelled=1`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: any) {
    console.error('[platform-checkout]', err)
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 })
  }
}
