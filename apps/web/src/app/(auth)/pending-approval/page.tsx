import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logoutAction } from '@/lib/auth/actions'
import { ResubmitButton } from './resubmit-button'

export const metadata = { title: 'Cuenta pendiente' }

export default async function PendingApprovalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('approval_status, rejection_reason, rejection_count')
    .eq('id', user.id)
    .single()

  const status = profile?.approval_status ?? 'pending'

  if (status === 'blocked') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <span className="text-3xl">🚫</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Cuenta bloqueada
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed max-w-xs mx-auto">
          Tu solicitud fue rechazada varias veces y ya no puedes volver a intentarlo desde aquí. Contacta directamente al gimnasio para más información.
        </p>
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

  if (status === 'rejected') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <span className="text-3xl">❌</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Solicitud rechazada
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed max-w-xs mx-auto">
          El administrador rechazó tu solicitud de acceso.
        </p>

        {profile?.rejection_reason && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
            <p className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">Motivo</p>
            <p className="text-sm text-red-800">{profile.rejection_reason}</p>
          </div>
        )}

        <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
          Puedes solicitar una nueva revisión ({3 - (profile?.rejection_count ?? 0)} intento{3 - (profile?.rejection_count ?? 0) !== 1 ? 's' : ''} restante{3 - (profile?.rejection_count ?? 0) !== 1 ? 's' : ''}).
        </p>

        <div className="mt-4">
          <ResubmitButton />
        </div>

        <form action={logoutAction} className="mt-3">
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
