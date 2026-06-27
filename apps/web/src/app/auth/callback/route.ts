import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  console.log('[auth/callback] request.url =', request.url)
  console.log('[auth/callback] origin =', origin)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    // Build the redirect response first so we can attach cookies to it.
    // The Supabase server client writes the session cookies directly onto
    // this response — that way the browser receives them in the same request
    // that performs the PKCE code exchange.
    const redirectResponse = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              redirectResponse.cookies.set(name, value, options as Parameters<typeof redirectResponse.cookies.set>[2]),
            )
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return redirectResponse
    }

    console.error('[auth/callback] exchangeCodeForSession:', error.message)
  }

  // Token missing or exchange failed.
  // If the callback was initiated by the password-reset flow, bounce back there.
  // Otherwise send the user to login with a generic error flag.
  const errorDest = next.startsWith('/reset-password')
    ? `${origin}/reset-password?error=invalid_link`
    : `${origin}/login?error=oauth_error`
  return NextResponse.redirect(errorDest)
}
