'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction } from '@/lib/auth/actions'

interface Branch {
  id: string
  name: string
  address: string | null
  tenants: { name: string } | null
}

interface Props {
  branches: Branch[]
  slug?: string
}

export function RegisterForm({ branches, slug }: Props) {
  const [state, formAction, isPending] = useActionState(registerAction, null)
  const loginHref = slug ? `/login/${slug}` : '/login'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Crear cuenta
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Solicita acceso a la plataforma
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {state?.error && (
          <div className="rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 px-4 py-3">
            <p className="text-sm text-[var(--color-destructive)]">{state.error}</p>
          </div>
        )}

        {/* Branch visual cards */}
        {branches.length > 0 && (
          <fieldset className="space-y-2" disabled={isPending}>
            <legend className="block text-sm font-medium text-[var(--color-foreground)]">
              Sede <span className="text-[var(--color-destructive)]">*</span>
            </legend>
            <div className="grid gap-2 mt-1.5">
              {branches.map((b, i) => (
                <label key={b.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="branch_id"
                    value={b.id}
                    required={i === 0}
                    className="sr-only peer"
                  />
                  <div className="rounded-xl border-2 border-[var(--color-input)] px-4 py-3 transition-all
                                  peer-checked:border-[var(--color-primary)]
                                  peer-checked:bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-card))]
                                  hover:border-[var(--color-primary)]/60
                                  peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
                    <p className="font-semibold text-sm text-[var(--color-foreground)]">
                      {b.name}
                    </p>
                    {b.address && (
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        {b.address}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="space-y-1.5">
          <label htmlFor="full_name" className="block text-sm font-medium text-[var(--color-foreground)]">
            Nombre completo
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            placeholder="Juan Pérez"
            disabled={isPending}
            className="w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none transition-all focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 disabled:opacity-50"
          />
        </div>

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
            disabled={isPending}
            className="w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none transition-all focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-[var(--color-foreground)]">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Mínimo 8 caracteres"
            disabled={isPending}
            className="w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none transition-all focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Registrando…' : 'Solicitar acceso'}
        </button>

        <p className="text-xs text-center text-[var(--color-muted-foreground)]">
          Tu cuenta será revisada por un administrador antes de tener acceso.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
        ¿Ya tienes cuenta?{' '}
        <Link href={loginHref} className="font-medium text-[var(--color-foreground)] hover:underline underline-offset-4">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
