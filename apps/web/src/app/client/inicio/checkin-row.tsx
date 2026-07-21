import Link from 'next/link'
import { QrCode, CheckCircle2 } from 'lucide-react'
import { CheckinButton } from '../gamificacion/checkin-button'

interface CheckinRowProps {
  userId: string
  tenantId: string
  appAlreadyCheckedIn: boolean
  gymAlreadyCheckedIn: boolean
}

// Front-and-center on the home screen: the two check-in actions a client
// reaches for every day (async app engagement vs. physical gym attendance),
// side by side so neither is buried behind a menu.
export function CheckinRow({ userId, tenantId, appAlreadyCheckedIn, gymAlreadyCheckedIn }: CheckinRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex flex-col items-center text-center gap-2">
        <p className="text-sm font-bold text-[var(--color-foreground)]">Check-in en la app</p>
        <p className="text-xs text-[var(--color-muted-foreground)] -mt-1 mb-1">Registra tu actividad de hoy</p>
        <CheckinButton userId={userId} tenantId={tenantId} alreadyCheckedIn={appAlreadyCheckedIn} />
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex flex-col items-center text-center gap-2">
        <p className="text-sm font-bold text-[var(--color-foreground)]">Check-in en el gym</p>
        <p className="text-xs text-[var(--color-muted-foreground)] -mt-1 mb-1">Escanea el QR al llegar</p>

        {gymAlreadyCheckedIn ? (
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-5 py-2.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-semibold">Ya marcaste asistencia hoy</span>
          </div>
        ) : (
          <Link
            href="/client/checkin-scan"
            className="relative inline-flex min-w-[220px] items-center justify-center gap-2.5 rounded-xl bg-[var(--color-client)] px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <QrCode className="h-4 w-4" />
            Escanear QR
          </Link>
        )}
      </div>
    </div>
  )
}
