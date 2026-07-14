import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Route Handler (GET) instead of Server Action so that the PKCE code-verifier
// cookie written by signInWithOAuth is reliably included in the redirect response.
// Server Actions that call redirect() can drop Set-Cookie headers in Next.js 15.
export async function GET() {
  const cookieStore = await cookies()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Collect cookies Supabase wants to set (e.g. PKCE code verifier).
  const pendingCookies: { name: string; value: string; options?: object }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet)
        },
      },
    },
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=/select-branch`,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_error`)
  }

  // Build the redirect and attach the PKCE cookie before returning.
  const res = NextResponse.redirect(data.url)
  for (const { name, value, options } of pendingCookies) {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2])
  }
  return res
}
