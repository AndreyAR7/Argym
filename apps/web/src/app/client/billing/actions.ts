'use server'

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' })
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface StripeInvoice {
  id: string
  number: string | null
  amount_paid: number
  currency: string
  status: string | null
  created: number
  invoice_pdf: string | null
  hosted_invoice_url: string | null
  period_start: number
  period_end: number
  description: string | null
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Returns the Stripe customer ID for the current user.
 * Strategy:
 *   1. Look for stripe_customer_id on the user's profile row.
 *   2. Fall back: look for a stripe_subscription_id on any active
 *      plan_subscription and retrieve the customer from Stripe.
 *   3. Fall back: search Stripe customers by email.
 */
async function resolveStripeCustomerId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userEmail: string,
): Promise<{ customerId?: string; subscriptionId?: string; error?: string }> {
  // 1. Check profiles table for stripe_customer_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profile?.stripe_customer_id) {
    return { customerId: profile.stripe_customer_id }
  }

  // 2. Check plan_subscriptions for a stripe_subscription_id
  const { data: sub } = await supabase
    .from('plan_subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .not('stripe_subscription_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const stripeSubId = sub?.stripe_subscription_id as string | undefined

  if (stripeSubId) {
    try {
      const stripe = getStripe()
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
      const customerId =
        typeof stripeSub.customer === 'string'
          ? stripeSub.customer
          : stripeSub.customer.id
      return { customerId, subscriptionId: stripeSubId }
    } catch {
      // subscription may have been deleted in Stripe — fall through
    }
  }

  // 3. Search Stripe by email
  try {
    const stripe = getStripe()
    const result = await stripe.customers.search({
      query: `email:"${userEmail}"`,
      limit: 1,
    })
    const customer = result.data[0]
    if (customer) {
      return { customerId: customer.id, subscriptionId: stripeSubId }
    }
  } catch {
    // ignore search errors
  }

  return { subscriptionId: stripeSubId }
}

// ─────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────

export async function getMyInvoicesAction(): Promise<{
  invoices?: StripeInvoice[]
  stripeConnected: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { stripeConnected: false, error: 'No autenticado' }

    const { customerId, subscriptionId } = await resolveStripeCustomerId(
      supabase,
      user.id,
      user.email ?? '',
    )

    // No Stripe link at all
    if (!customerId && !subscriptionId) {
      return { stripeConnected: false, invoices: [] }
    }

    const stripe = getStripe()

    // Build list filter — prefer subscription-scoped, fall back to customer-scoped
    const listParams: Stripe.InvoiceListParams = {
      limit: 24,
    }
    if (subscriptionId) {
      listParams.subscription = subscriptionId
    } else if (customerId) {
      listParams.customer = customerId
    }

    const { data: rawInvoices } = await stripe.invoices.list(listParams)

    const invoices: StripeInvoice[] = rawInvoices.map((inv) => ({
      id: inv.id ?? '',
      number: inv.number ?? null,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? null,
      created: inv.created,
      invoice_pdf: inv.invoice_pdf ?? null,
      hosted_invoice_url: inv.hosted_invoice_url ?? null,
      period_start: inv.period_start,
      period_end: inv.period_end,
      description: inv.description ?? null,
    }))

    return { stripeConnected: true, invoices }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[billing] getMyInvoicesAction:', msg)
    return { stripeConnected: false, error: msg }
  }
}

export async function createBillingPortalSessionAction(): Promise<{
  url?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { error: 'No autenticado' }

    const { customerId, error } = await resolveStripeCustomerId(
      supabase,
      user.id,
      user.email ?? '',
    )

    if (!customerId) {
      return { error: 'No se encontró una cuenta de facturación asociada.' }
    }

    const stripe = getStripe()
    const returnUrl =
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/client/billing`
        : 'http://localhost:3000/client/billing'

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return { url: session.url }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[billing] createBillingPortalSessionAction:', msg)
    return { error: msg }
  }
}
