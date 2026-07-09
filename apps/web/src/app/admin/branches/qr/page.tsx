import { createClient } from '@/lib/supabase/server'
import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { Building2, QrCode } from 'lucide-react'
import { CopyUrlButton } from './copy-url-button'
import { QrDownloadButton } from './qr-download-button'
import Link from 'next/link'
import QRCode from 'qrcode'

export const metadata = { title: 'QR Check-in' }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tu-dominio.com'

function checkinUrl(branchId: string) {
  return `${APP_URL}/checkin?branch=${branchId}`
}

async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
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

  // Generate all QR data URLs server-side (no external calls, no CSP issues)
  const branchesWithQr = await Promise.all(
    (branches ?? []).map(async (branch) => {
      const url = checkinUrl(branch.id)
      const qrDataUrl = await generateQrDataUrl(url)
      return { ...branch, url, qrDataUrl }
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

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-amber-500/5 px-4 py-3 flex items-start gap-3">
        <QrCode size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Imprime o muestra el QR de cada sucursal en la entrada. Los clientes lo escanean para registrar su asistencia y ganar XP automáticamente.
        </p>
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
              <div
                key={branch.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
              >
                {/* Card header */}
                <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-[var(--color-muted-foreground)] shrink-0" />
                    <h2 className="font-semibold text-[var(--color-foreground)] truncate">{branch.name}</h2>
                  </div>
                  {branch.address && (
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)] truncate pl-5">
                      {branch.address}
                    </p>
                  )}
                </div>

                {/* QR code — generated server-side as PNG data URL, no external requests */}
                <div className="flex justify-center py-6 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={branch.qrDataUrl}
                    alt={`QR de check-in para ${branch.name}`}
                    width={220}
                    height={220}
                    className="rounded-lg"
                  />
                </div>

                {/* URL + actions */}
                <div className="px-5 pb-5 pt-4 space-y-3">
                  <p className="font-mono text-[10px] text-[var(--color-muted-foreground)] break-all leading-relaxed bg-[var(--color-muted)] rounded-lg px-3 py-2">
                    {branch.url}
                  </p>
                  <div className="flex items-center gap-2">
                    <CopyUrlButton url={branch.url} />
                    <QrDownloadButton dataUrl={branch.qrDataUrl} branchName={branch.name} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
