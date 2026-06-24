import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-[var(--color-background)]">
      <p className="text-6xl font-bold text-[var(--color-border)]">404</p>
      <h1 className="text-lg font-semibold text-[var(--color-foreground)]">Página no encontrada</h1>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        La ruta que buscas no existe.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
