import { createClient } from '@/lib/supabase/server'
import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { Building2, QrCode, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { generateQrToken, secondsUntilNextWindow } from '@/lib/qr-token'
import { DynamicQrCard } from './dynamic-qr-card'

export const metadata = { title: 'QR Check-in' }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tu-dominio.com'

async function buildQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 220,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

export default async function QrPage() {
  const session = await getSessionData()
  if (!session) return null

  const { supabase, tenantId } = session

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, address, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name')

  const count = branches?.length ?? 0

  // Generate initial tokens + QR data URLs server-side
  const expiresIn = secondsUntilNextWindow()
  const branchesWithQr = await Promise.all(
    (branches ?? []).map(async (branch) => {
      const token     = generateQrToken(branch.id)
      const checkinUrl = `${APP_URL}/checkin?branch=${branch.id}&t=${token}`
      const qrDataUrl  = await buildQrDataUrl(checkinUrl)
      return { ...branch, qrDataUrl, checkinUrl }
    }),
  )

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="QR Check-in"
        subtitle={`${count} sucursal${count !== 1 ? 'es' : ''} activa${count !== 1 ? 's' : ''}`}
      >
        <Link
          href="/admin/branches"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
        >
          <Building2 size={14} />
          Ver sucursales
        </Link>
      </PageHeader>

      {/* Info banners */}
      <div className="mt-4 space-y-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-amber-500/5 px-4 py-3 flex items-start gap-3">
          <QrCode size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Muestra el QR en una pantalla en la entrada. Los clientes lo escanean para registrar asistencia y ganar XP automáticamente.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-emerald-500/5 px-4 py-3 flex items-start gap-3">
          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-muted-foreground)]">
            El código cambia automáticamente cada 5 minutos. Las fotos del QR no sirven para hacer check-in después de que expire.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Building2 size={40} className="text-[var(--color-border)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">Sin sucursales activas</p>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5 max-w-sm">
                Activa al menos una sucursal para generar su código QR.
              </p>
            </div>
            <Link
              href="/admin/branches"
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
            >
              Gestionar sucursales
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {branchesWithQr.map((branch) => (
              <DynamicQrCard
                key={branch.id}
                branchId={branch.id}
                branchName={branch.name}
                address={branch.address ?? null}
                initialQrUrl={branch.qrDataUrl}
                initialCheckinUrl={branch.checkinUrl}
                initialExpiresIn={expiresIn}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
