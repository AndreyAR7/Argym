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
}

export function RegisterForm({ branches }: Props) {
  const [state, formAction, isPending] = useActionState(registerAction, null)

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

        {/* Branch / Gym selector */}
        {branches.length > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="branch_id" className="block text-sm font-medium text-[var(--color-foreground)]">
              Gimnasio / Sede <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <select
              id="branch_id"
              name="branch_id"
              required
              disabled={isPending}
              defaultValue=""
              className="w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] outline-none transition-all focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 disabled:opacity-50"
            >
              <option value="" disabled>Selecciona tu sede</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.tenants?.name ? `${b.tenants.name} — ` : ''}{b.name}
                  {b.address ? ` · ${b.address}` : ''}
                </option>
              ))}
            </select>
          </div>
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
        <Link href="/login" className="font-medium text-[var(--color-foreground)] hover:underline underline-offset-4">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
