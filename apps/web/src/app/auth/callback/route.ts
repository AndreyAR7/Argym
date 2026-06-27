import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL

  const proto = request.headers.get('x-forwarded-proto')
  const host  = request.headers.get('x-forwarded-host')
  if (proto && host) return `${proto}://${host}`

  return request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  const baseUrl = getBaseUrl(request)

  if (code) {
    // Build the redirect response first so we can attach cookies to it.
    // The Supabase server client writes the session cookies directly onto
    // this response — that way the browser receives them in the same request
    // that performs the PKCE code exchange.
    const redirectResponse = NextResponse.redirect(`${baseUrl}${next}`)

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
    ? `${baseUrl}/reset-password?error=invalid_link`
    : `${baseUrl}/login?error=oauth_error`
  return NextResponse.redirect(errorDest)
}
