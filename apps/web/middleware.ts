import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/pending-approval', '/auth/', '/suspended', '/terms', '/privacy']

// Parse the JWT expiry without a network call
function getJwtExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ?? 0
  } catch {
    return 0
  }
}

export async function middleware(request: NextRequest) {
  const t0 = Date.now()
  const { pathname } = request.nextUrl
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // Slug-branded auth pages: /login/<slug>, /register/<slug>, /select-branch?slug=<slug>
  const tenantSlugMatch = pathname.match(/^\/(?:login|register)\/([a-z0-9-]+)\/?$/)
  const tenantSlug = tenantSlugMatch?.[1]
    ?? (pathname === '/select-branch' ? request.nextUrl.searchParams.get('slug') ?? undefined : undefined)

  const baseHeaders = new Headers(request.headers)
  if (tenantSlug) baseHeaders.set('x-tenant-slug', tenantSlug)
  let supabaseResponse = NextResponse.next({ request: { headers: baseHeaders } })

  // ── FAST PATH: already authenticated + profile cached in cookies ──
  // Parse the JWT locally (zero network calls) to confirm it's not expired.
  // All actual data access is still protected by Supabase RLS.
  const cachedTenantId = request.cookies.get('x-tid')?.value
  const cachedRole     = request.cookies.get('x-role')?.value

  const cachedActive = request.cookies.get('x-active')?.value

  if (cachedTenantId && cachedRole) {
    // Find the access token cookie (named 'sb-*-auth-token' or similar)
    const allCookies = request.cookies.getAll()
    const authCookie = allCookies.find(c => c.name.includes('auth-token') && !c.name.includes('code'))
    let jwtValid = false

    if (authCookie) {
      try {
        const parsed = JSON.parse(authCookie.value)
        const token = parsed?.access_token ?? parsed
        if (typeof token === 'string') {
          const exp = getJwtExpiry(token)
          jwtValid = exp > Math.floor(Date.now() / 1000) + 60 // valid for at least 60 more seconds
        }
      } catch {
        // chunked cookie — try the first chunk
        try {
          const chunk0 = allCookies.find(c => c.name.includes('auth-token.0'))
          if (chunk0) {
            const partial = JSON.parse(chunk0.value)
            const token = partial?.access_token
            if (typeof token === 'string') {
              const exp = getJwtExpiry(token)
              jwtValid = exp > Math.floor(Date.now() / 1000) + 60
            }
          }
        } catch { /* ignore */ }
      }
    }

    if (jwtValid) {
      if (process.env.NODE_ENV !== 'production') console.log(`[MW] FAST: ${Date.now() - t0}ms`)

      // Suspend check: redirect to /suspended if tenant is inactive
      if (cachedActive === 'false' && !isPublicPath && pathname !== '/suspended') {
        const suspendedUrl = request.nextUrl.clone()
        suspendedUrl.pathname = '/suspended'
        return NextResponse.redirect(suspendedUrl)
      }

      // Set as REQUEST headers so headers() in server components can read them
      const reqHeaders = new Headers(request.headers)
      reqHeaders.set('x-tenant-id', cachedTenantId)
      reqHeaders.set('x-user-role', cachedRole)
      if (tenantSlug) reqHeaders.set('x-tenant-slug', tenantSlug)
      return NextResponse.next({ request: { headers: reqHeaders } })
    }
  }

  // ── SLOW PATH: first request, token expired, or cache miss → validate with Supabase ──
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: baseHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2]),
          )
        },
      },
    },
  )

  const t1 = Date.now()
  const { data: { user } } = await supabase.auth.getUser()
  if (process.env.NODE_ENV !== 'production') console.log(`[MW] getUser: ${Date.now() - t1}ms`)

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    return NextResponse.redirect(homeUrl)
  }

  if (user) {
    if (!cachedTenantId || !cachedRole) {
      const t2 = Date.now()
      const [profileRes, roleRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('tenant_id, full_name, avatar_url, approval_status')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', user.id)
          .limit(1)
          .single(),
      ])
      if (process.env.NODE_ENV !== 'production') console.log(`[MW] DB profile+role: ${Date.now() - t2}ms`)

      const tenantId = profileRes.data?.tenant_id
      const role = (roleRes.data?.roles as any)?.name as string | undefined
      const fullName = profileRes.data?.full_name ?? ''
      const avatarUrl = profileRes.data?.avatar_url ?? ''
      const approvalStatus = profileRes.data?.approval_status ?? 'pending'

      // Check if tenant is active (for suspension enforcement)
      let tenantIsActive = true
      if (tenantId) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('is_active')
          .eq('id', tenantId)
          .single()
        tenantIsActive = tenantData?.is_active ?? true
      }

      const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 8,
      }

      if (tenantId) supabaseResponse.cookies.set('x-tid', tenantId, cookieOpts)
      if (role)     supabaseResponse.cookies.set('x-role', role, cookieOpts)
      if (fullName) supabaseResponse.cookies.set('x-name', fullName, { ...cookieOpts, httpOnly: false })
      if (avatarUrl) supabaseResponse.cookies.set('x-avatar', avatarUrl, { ...cookieOpts, httpOnly: false })
      supabaseResponse.cookies.set('x-approval', approvalStatus, cookieOpts)
      supabaseResponse.cookies.set('x-active', String(tenantIsActive), cookieOpts)

      // Redirect to suspended if tenant inactive (slow path)
      if (!tenantIsActive && !isPublicPath && pathname !== '/suspended') {
        const suspendedUrl = request.nextUrl.clone()
        suspendedUrl.pathname = '/suspended'
        return NextResponse.redirect(suspendedUrl)
      }

    }
  }

  // Propagate tenant/role as REQUEST headers so headers() in server components can read them.
  // We rebuild the response with modified request headers and copy all Set-Cookie from supabaseResponse.
  const finalTenantId = (user && !cachedTenantId)
    ? supabaseResponse.cookies.get('x-tid')?.value ?? null
    : cachedTenantId ?? null
  const finalRole = (user && !cachedRole)
    ? supabaseResponse.cookies.get('x-role')?.value ?? null
    : cachedRole ?? null

  if (user && finalTenantId && finalRole) {
    const reqHeaders = new Headers(request.headers)
    reqHeaders.set('x-tenant-id', finalTenantId)
    reqHeaders.set('x-user-role', finalRole)
    if (tenantSlug) reqHeaders.set('x-tenant-slug', tenantSlug)
    const freshResponse = NextResponse.next({ request: { headers: reqHeaders } })
    // Copy all Set-Cookie headers (preserves httpOnly, secure, sameSite options)
    const hdrs = supabaseResponse.headers as unknown as { getSetCookie?: () => string[] }
    const setCookies: string[] = typeof hdrs.getSetCookie === 'function' ? hdrs.getSetCookie() : []
    for (const sc of setCookies) {
      freshResponse.headers.append('set-cookie', sc)
    }
    if (process.env.NODE_ENV !== 'production') console.log(`[MW] TOTAL: ${Date.now() - t0}ms`)
    return freshResponse
  }

  console.log(`[MW] TOTAL (slow path): ${Date.now() - t0}ms | ${pathname}`)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
