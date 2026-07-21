'use client'

import { Suspense, useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { loginAction } from '@/lib/auth/actions'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

// Isolated to its own component so useSearchParams() is inside the Suspense boundary.
function OAuthError() {
  const searchParams = useSearchParams()
  if (searchParams.get('error') !== 'oauth_error') return null
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 px-4 py-3 mb-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-destructive)]" />
      <p className="text-sm text-[var(--color-destructive)]">
        Error al iniciar sesión con Google. Intenta de nuevo.
      </p>
    </div>
  )
}

function LoginFormFields({ slug }: { slug?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const registerHref = slug ? `/register/${slug}` : '/register'
  const googleHref = slug ? `/auth/google?slug=${slug}` : '/auth/google'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Iniciar sesión
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Ingresa tus credenciales para continuar
        </p>
      </div>

      {/* Google OAuth button — uses a GET route so the PKCE code-verifier
           cookie is reliably set before the browser follows the redirect. */}
      <a href={googleHref} className="block w-full">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition-all hover:bg-[var(--color-muted)] hover:border-[var(--color-admin)]/30 active:scale-[0.99]"
        >
          <GoogleIcon />
          Continuar con Google
        </button>
      </a>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[var(--color-card)] px-3 text-[var(--color-muted-foreground)]">
            o con correo y contraseña
          </span>
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        {state?.error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-destructive)]" />
            <p className="text-sm text-[var(--color-destructive)]">{state.error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-[var(--color-foreground)]">
            Correo electrónico
          </label>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)] transition-colors group-focus-within:text-[var(--color-admin)]" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nombre@empresa.com"
              className="w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] py-2.5 pl-10 pr-3.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none transition-all focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/20 disabled:opacity-50"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--color-foreground)]">
              Contraseña
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="group relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)] transition-colors group-focus-within:text-[var(--color-admin)]" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] py-2.5 pl-10 pr-10 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none transition-all focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/20 disabled:opacity-50"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={isPending}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-admin)] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[var(--color-admin)]/25 transition-all hover:shadow-lg hover:shadow-[var(--color-admin)]/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
        ¿No tienes una cuenta?{' '}
        <Link
          href={registerHref}
          className="font-medium text-[var(--color-foreground)] hover:underline underline-offset-4"
        >
          Regístrate
        </Link>
      </p>
    </div>
  )
}

// OAuthError uses useSearchParams() which requires a Suspense boundary (Next.js 15).
// LoginFormFields is kept outside so it always renders — including the Google button.
export function LoginForm({ slug }: { slug?: string }) {
  return (
    <>
      <Suspense fallback={null}>
        <OAuthError />
      </Suspense>
      <LoginFormFields slug={slug} />
    </>
  )
}
