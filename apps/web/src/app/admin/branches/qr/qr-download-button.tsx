'use client'

import { Download } from 'lucide-react'

export function QrDownloadButton({ dataUrl, branchName }: { dataUrl: string; branchName: string }) {
  const filename = `qr-checkin-${branchName.toLowerCase().replace(/\s+/g, '-')}.png`

  return (
    <a
      href={dataUrl}
      download={filename}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)] transition-colors"
    >
      <Download size={12} />
      Descargar QR
    </a>
  )
}
