import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Route Handler (GET), not a Server Action — Server Actions that set cookies
// and then call redirect() can silently drop the Set-Cookie header in
// Next.js 15 (same reasoning as /auth/google/route.ts). Build the redirect
// response first and attach cookies directly to it.
export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!tenantId) {
    return NextResponse.redirect(`${baseUrl}/select-gym`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // No Supabase auth-cookie changes happen here (no sign-in/refresh) —
          // nothing to relay.
        },
      },
    },
  )

  const { data: tenantIsActive, error } = await supabase.rpc('switch_platform_admin_tenant', {
    p_tenant_id: tenantId,
  })

  if (error) {
    return NextResponse.redirect(`${baseUrl}/select-gym?error=${encodeURIComponent(error.message)}`)
  }

  const redirectResponse = NextResponse.redirect(`${baseUrl}/admin/dashboard`)
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 8,
    path: '/',
  }
  redirectResponse.cookies.set('x-tid', tenantId, cookieOpts)
  redirectResponse.cookies.set('x-tenant-active', String(tenantIsActive ?? true), cookieOpts)
  // This RPC only ever succeeds for a platform admin (checked inside
  // switch_platform_admin_tenant) and always lands on /admin/dashboard — the
  // role in the target tenant is always 'admin' by definition of this flow,
  // never whatever role was cached from the tenant they switched away from.
  // Without this, x-role kept its stale pre-switch value indefinitely, since
  // nothing else in the fast path ever re-derives it once cached.
  redirectResponse.cookies.set('x-role', 'admin', cookieOpts)

  return redirectResponse
}
