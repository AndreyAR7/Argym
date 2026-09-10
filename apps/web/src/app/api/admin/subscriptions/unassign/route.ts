import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { unassignSubscription } from '@/lib/billing/unassign-subscription'

// Mobile has no direct Stripe access (only the web app holds
// STRIPE_SECRET_KEY, see apps/web/src/lib/stripe.ts) so the mobile admin
// "Desasignar plan" action calls this instead of a direct RPC. Auth is the
// caller's own Supabase access token forwarded as a bearer header — the
// underlying cancel_subscription/record_subscription_refund RPCs already
// enforce has_permission('billing.manage') via auth.uid(), so this route
// does no authorization of its own beyond passing that token through.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const subscriptionId = body?.subscriptionId as string | undefined
  const reason = body?.reason as string | undefined
  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId es requerido' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const result = await unassignSubscription(supabase, subscriptionId, reason)
  if (result.error) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
