import { logoutAction } from '@/lib/auth/actions'

export const metadata = { title: 'Cuenta suspendida' }

export default function AccountSuspendedPage() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <span className="text-3xl">🔒</span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
        Cuenta suspendida
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed max-w-xs mx-auto">
        Tu membresía venció sin pago y tu cuenta fue suspendida temporalmente. Contacta a tu gimnasio para regularizar tu pago y reactivar el acceso.
      </p>

      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-left">
        <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
          ¿Ya realizaste el pago?
        </p>
        <p className="text-sm text-[var(--color-foreground)]">
          Si pagaste en efectivo o por transferencia, avísale al administrador de tu gimnasio para que reactive tu cuenta manualmente.
        </p>
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
