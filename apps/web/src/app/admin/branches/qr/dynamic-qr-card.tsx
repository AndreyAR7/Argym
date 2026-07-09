'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Building2, MonitorPlay } from 'lucide-react'
import { CopyUrlButton } from './copy-url-button'
import { QrDownloadButton } from './qr-download-button'

const WINDOW_SECONDS = 300

interface Props {
  branchId:        string
  branchName:      string
  address:         string | null
  initialQrUrl:    string
  initialCheckinUrl: string
  initialExpiresIn: number
}

export function DynamicQrCard({
  branchId,
  branchName,
  address,
  initialQrUrl,
  initialCheckinUrl,
  initialExpiresIn,
}: Props) {
  const [qrUrl,       setQrUrl]       = useState(initialQrUrl)
  const [checkinUrl,  setCheckinUrl]  = useState(initialCheckinUrl)
  const [secondsLeft, setSecondsLeft] = useState(initialExpiresIn)
  const [refreshing,  setRefreshing]  = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/qr-token?branchId=${branchId}`)
      if (res.ok) {
        const data = await res.json()
        setQrUrl(data.qrDataUrl)
        setCheckinUrl(data.url)
        setSecondsLeft(data.expiresIn)
      }
    } finally {
      setRefreshing(false)
    }
  }, [branchId])

  // Countdown tick
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          refresh()
          return WINDOW_SECONDS
        }
        return s - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [refresh])

  const progress = secondsLeft / WINDOW_SECONDS
  const minutes  = Math.floor(secondsLeft / 60)
  const secs     = secondsLeft % 60

  // SVG ring
  const R = 18
  const C = 2 * Math.PI * R // circumference ≈ 113
  const dash = C * progress

  const ringColor =
    progress > 0.4 ? '#22c55e' :
    progress > 0.15 ? '#f59e0b' :
    '#ef4444'

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-[var(--color-muted-foreground)] shrink-0" />
          <h2 className="font-semibold text-[var(--color-foreground)] truncate">{branchName}</h2>
        </div>
        {address && (
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)] truncate pl-5">{address}</p>
        )}
      </div>

      {/* QR — white background required for QR scanning */}
      <div className="relative flex justify-center py-6 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt={`QR check-in ${branchName}`}
          width={220}
          height={220}
          className={`rounded-lg transition-opacity duration-300 ${refreshing ? 'opacity-30' : 'opacity-100'}`}
        />

        {/* Refresh spinner overlay */}
        {refreshing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw size={28} className="animate-spin text-gray-400" />
          </div>
        )}

        {/* Countdown ring — bottom right */}
        <div className="absolute bottom-3 right-3 flex items-center justify-center">
          <svg width={44} height={44} className="drop-shadow-sm">
            {/* Background track */}
            <circle cx={22} cy={22} r={R} fill="white" stroke="#e5e7eb" strokeWidth={3} />
            {/* Progress arc */}
            <circle
              cx={22} cy={22} r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth={3}
              strokeDasharray={`${dash} ${C}`}
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
              style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}
            />
            {/* Time text */}
            <text
              x={22} y={22}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fontWeight={600}
              fill={ringColor}
              fontFamily="system-ui, sans-serif"
            >
              {minutes}:{String(secs).padStart(2, '0')}
            </text>
          </svg>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 pt-4 space-y-3">
        <p className="font-mono text-[10px] text-[var(--color-muted-foreground)] break-all leading-relaxed bg-[var(--color-muted)] rounded-lg px-3 py-2">
          {checkinUrl}
        </p>
        <div className="flex items-center gap-2">
          <CopyUrlButton url={checkinUrl} />
          <QrDownloadButton dataUrl={qrUrl} branchName={branchName} />
          <a
            href={`/monitor/${branchId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir vista de monitor (pantalla completa para la entrada)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)] transition-colors"
          >
            <MonitorPlay size={12} />
            Monitor
          </a>
        </div>
        <p className="text-[10px] text-[var(--color-muted-foreground)] flex items-center gap-1">
          <RefreshCw size={9} />
          El QR cambia cada 5 minutos — las fotos no sirven para hacer check-in
        </p>
      </div>
    </div>
  )
}
