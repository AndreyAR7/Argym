import Link from 'next/link'

interface LevelGateProps {
  requiredLevel: number
  currentLevel: number
  children: React.ReactNode
  featureName: string
}

/**
 * Renders children when the user's level meets the requirement.
 * Otherwise renders a locked card with the level requirement.
 */
export function LevelGate({ requiredLevel, currentLevel, children, featureName }: LevelGateProps) {
  if (currentLevel >= requiredLevel) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 px-6 py-12 text-center space-y-3">
      <span className="text-4xl">🔒</span>
      <p className="text-base font-bold text-[var(--color-foreground)]">Bloqueado</p>
      <p className="text-sm text-[var(--color-muted-foreground)] max-w-xs">
        Necesitas alcanzar el{' '}
        <span className="font-semibold text-[var(--color-client)]">Nivel {requiredLevel}</span>{' '}
        para acceder a <span className="font-semibold">{featureName}</span>.
      </p>
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Tu nivel actual:{' '}
        <span className="font-semibold text-[var(--color-foreground)]">{currentLevel}</span>
      </p>
      <Link
        href="/client/gamificacion"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-client)] px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
      >
        Ver mi progreso →
      </Link>
    </div>
  )
}
