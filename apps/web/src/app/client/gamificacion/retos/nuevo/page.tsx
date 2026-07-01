import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth/session'
import { getUserUnlocks } from '@/lib/gamification/get-user-unlocks'
import { NuevoRetoForm } from './nuevo-reto-form'

export const metadata = { title: 'Crear Reto' }

export default async function NuevoRetoPage() {
  const session = await getSessionData()
  if (!session) redirect('/login')

  const unlocks = await getUserUnlocks(session.user.id)

  if (!unlocks.can_create_challenges) {
    return (
      <div className="max-w-lg mx-auto p-4 md:p-8">
        {/* Back link */}
        <Link
          href="/client/gamificacion/retos"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Retos
        </Link>

        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 px-6 py-16 text-center space-y-3">
          <span className="text-5xl">🔒</span>
          <p className="text-xl font-bold text-[var(--color-foreground)]">Bloqueado</p>
          <p className="text-sm text-[var(--color-muted-foreground)] max-w-xs">
            Necesitas alcanzar el{' '}
            <span className="font-semibold text-[var(--color-client)]">Nivel 5</span>{' '}
            para crear retos.
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Tu nivel actual:{' '}
            <span className="font-semibold text-[var(--color-foreground)]">{unlocks.level}</span>
          </p>
          <Link
            href="/client/gamificacion"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-client)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          >
            Ver mi progreso →
          </Link>
        </div>
      </div>
    )
  }

  return <NuevoRetoForm />
}
