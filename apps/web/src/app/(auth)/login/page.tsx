'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/lib/auth/actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)

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

      <form action={formAction} className="space-y-5">
        {state?.error && (
          <div className="rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 px-4 py-3">
            <p className="text-sm text-[var(--color-destructive)]">{state.error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-[var(--color-foreground)]">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="nombre@empresa.com"
            className="w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none transition-all focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 disabled:opacity-50"
            disabled={isPending}
          />
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
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none transition-all focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 disabled:opacity-50"
            disabled={isPending}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
        ¿No tienes una cuenta?{' '}
        <Link
          href="/register"
          className="font-medium text-[var(--color-foreground)] hover:underline underline-offset-4"
        >
          Regístrate
        </Link>
      </p>
    </div>
  )
}
