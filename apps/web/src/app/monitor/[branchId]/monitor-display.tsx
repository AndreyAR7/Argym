'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react'

const WINDOW_SECONDS = 300

interface Props {
  branchId:         string
  branchName:       string
  initialQrUrl:     string
  initialCheckinUrl: string
  initialExpiresIn: number
}

export function MonitorDisplay({
  branchId,
  branchName,
  initialQrUrl,
  initialCheckinUrl,
  initialExpiresIn,
}: Props) {
  const [qrUrl,       setQrUrl]       = useState(initialQrUrl)
  const [checkinUrl,  setCheckinUrl]  = useState(initialCheckinUrl)
  const [secondsLeft, setSecondsLeft] = useState(initialExpiresIn)
  const [refreshing,  setRefreshing]  = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/qr-public?branchId=${branchId}`)
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

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { refresh(); return WINDOW_SECONDS }
        return s - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [refresh])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const progress   = secondsLeft / WINDOW_SECONDS
  const minutes    = Math.floor(secondsLeft / 60)
  const secs       = secondsLeft % 60
  const R          = 22
  const C          = 2 * Math.PI * R
  const dash       = C * progress
  const ringColor  = progress > 0.4 ? '#34d399' : progress > 0.15 ? '#fbbf24' : '#f87171'

  return (
    <div
      className="min-h-screen flex flex-col select-none overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(16,185,129,0.13) 0%, #080810 55%)' }}
    >
      {/* Decorative grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 pt-7 pb-0">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-black font-black text-sm">A</span>
          </div>
          <div>
            <span className="text-white font-bold text-xl tracking-tight">ARGYM</span>
            {branchName && (
              <span className="ml-2 text-emerald-400/80 font-medium text-base">{branchName}</span>
            )}
          </div>
        </div>

        {/* Countdown ring */}
        <div className="flex items-center gap-2.5">
          <span className="text-white/30 text-xs">Renueva en</span>
          <svg width={56} height={56} aria-label={`${minutes}:${String(secs).padStart(2, '0')} para renovar`}>
            <circle cx={28} cy={28} r={R} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
            <circle
              cx={28} cy={28} r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth={3}
              strokeDasharray={`${dash} ${C}`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dasharray 1s linear, stroke 0.4s' }}
            />
            <text
              x={28} y={28}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={700}
              fill={ringColor}
              fontFamily="system-ui, sans-serif"
            >
              {minutes}:{String(secs).padStart(2, '0')}
            </text>
          </svg>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-8 py-6">
        {/* Welcome text */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-none">
            ¡Bienvenido!
          </h1>
          <p className="text-xl md:text-2xl text-emerald-400 font-medium tracking-wide">
            Escanea el código QR para registrar tu asistencia
          </p>
        </div>

        {/* QR card */}
        <div className="relative">
          {/* Glow rings */}
          <div className="absolute -inset-4 rounded-[2rem] border border-emerald-500/15" />
          <div className="absolute -inset-8 rounded-[2.5rem] border border-emerald-500/07" />

          {/* White card required for QR scanning */}
          <div className="relative bg-white rounded-3xl p-7 shadow-[0_0_80px_rgba(16,185,129,0.25)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="QR de check-in"
              width={420}
              height={420}
              className={`block rounded-xl transition-opacity duration-300 ${refreshing ? 'opacity-20' : 'opacity-100'}`}
            />
            {refreshing && (
              <div className="absolute inset-7 flex items-center justify-center rounded-xl">
                <RefreshCw size={48} className="animate-spin text-gray-300" />
              </div>
            )}
          </div>
        </div>

        {/* URL hint (small, for staff) */}
        <p className="text-white/20 text-xs font-mono max-w-md text-center truncate">{checkinUrl}</p>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-end justify-between px-8 pb-7">
        <p className="text-white/20 text-xs flex items-center gap-1.5">
          <RefreshCw size={10} />
          El código se renueva automáticamente cada 5 minutos
        </p>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/70 transition-all border border-white/5 hover:border-white/10"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </footer>
    </div>
  )
}
