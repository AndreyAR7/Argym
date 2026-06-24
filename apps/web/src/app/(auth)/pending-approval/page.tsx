import { logoutAction } from '@/lib/auth/actions'

export const metadata = { title: 'Cuenta pendiente' }

export default function PendingApprovalPage() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-muted)]">
        <span className="text-3xl">⏳</span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
        Cuenta en revisión
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed max-w-xs mx-auto">
        Tu solicitud de acceso está siendo revisada por el administrador. Te notificaremos cuando esté aprobada.
      </p>

      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-left">
        <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
          Próximos pasos
        </p>
        <ul className="space-y-1.5">
          {[
            'El administrador revisará tu solicitud',
            'Recibirás un correo de confirmación',
            'Podrás acceder a la plataforma',
          ].map((step, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm text-[var(--color-foreground)]">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-muted-foreground)] font-medium">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      <form action={logoutAction} className="mt-6">
        <button
          type="submit"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] hover:border-[var(--color-foreground)]/20"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
