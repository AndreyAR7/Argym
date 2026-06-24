'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { forgotPasswordAction } from '@/lib/auth/actions'

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, null)

  const inputCls = 'w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] px-3.5 py-2.5 pl-9 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none transition-all focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 disabled:opacity-50'

  if (state?.success) {
    return (
      <div>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            Revisa tu correo
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)] max-w-xs leading-relaxed">
            Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
        </div>
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
        >
          <ArrowLeft size={14} />
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Recuperar contraseña
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Te enviaremos un enlace para restablecer tu contraseña
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
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nombre@empresa.com"
              disabled={isPending}
              className={inputCls}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Enviando…' : 'Enviar enlace de recuperación'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-[var(--color-foreground)] hover:underline underline-offset-4"
        >
          <ArrowLeft size={13} />
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  )
}
