'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type jsQRType from 'jsqr'
import Link from 'next/link'
import { ArrowLeft, CameraOff } from 'lucide-react'

type Status = 'requesting' | 'active' | 'detected' | 'denied' | 'unsupported'

export default function CheckinScanPage() {
  const router = useRouter()
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const jsqrRef   = useRef<typeof jsQRType | null>(null)
  const [status, setStatus] = useState<Status>('requesting')

  // Dynamic import avoids Turbopack CJS bundling issues with jsqr
  useEffect(() => {
    import('jsqr').then((mod) => { jsqrRef.current = mod.default })
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const tick = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    if (video.readyState === video.HAVE_ENOUGH_DATA && jsqrRef.current) {
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code    = jsqrRef.current(imgData.data, imgData.width, imgData.height)
        if (code?.data) {
          try {
            const url = new URL(code.data)
            if (url.pathname.includes('/checkin') && url.searchParams.get('branch')) {
              stopCamera()
              setDetectedUrl(code.data)
              setStatus('detected')
              // Navigate to the existing checkin page — it handles validation + result display
              const dest = url.pathname + url.search
              setTimeout(() => router.push(dest), 600)
              return
            }
          } catch {
            // Not a URL — ignore, keep scanning
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [router, stopCamera])

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().then(() => {
            setStatus('active')
            rafRef.current = requestAnimationFrame(tick)
          })
        }
      })
      .catch(() => setStatus('denied'))

    return () => stopCamera()
  }, [tick, stopCamera])

  return (
    <div className="relative min-h-screen bg-black flex flex-col overflow-hidden">
      {/* Hidden canvas for QR decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video stream */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          status === 'active' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-4 pt-safe pt-4 pb-3">
        <Link
          href="/client/inicio"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-white font-semibold text-base">Check-in presencial</h1>
      </header>

      {/* Center — viewfinder or status */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">

        {/* Requesting camera */}
        {status === 'requesting' && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto animate-pulse">
              <span className="text-3xl">📷</span>
            </div>
            <p className="text-white/70 text-sm">Iniciando cámara...</p>
          </div>
        )}

        {/* Camera denied */}
        {status === 'denied' && (
          <div className="text-center space-y-4 px-8">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <CameraOff size={28} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-1">Sin permiso de cámara</p>
              <p className="text-white/60 text-sm">
                Permite el acceso a la cámara en la configuración de tu navegador para escanear el QR.
              </p>
            </div>
            <Link href="/client/inicio" className="inline-block mt-2 rounded-xl bg-white/10 px-6 py-2.5 text-sm text-white hover:bg-white/20 transition-colors">
              Volver
            </Link>
          </div>
        )}

        {/* Unsupported */}
        {status === 'unsupported' && (
          <div className="text-center space-y-4 px-8">
            <p className="text-white font-semibold">Cámara no disponible</p>
            <p className="text-white/60 text-sm">
              Tu navegador no admite acceso a cámara. Usa la app móvil de ARGYM para escanear el QR.
            </p>
            <Link href="/client/inicio" className="inline-block rounded-xl bg-white/10 px-6 py-2.5 text-sm text-white hover:bg-white/20 transition-colors">
              Volver
            </Link>
          </div>
        )}

        {/* QR detected */}
        {status === 'detected' && (
          <div className="text-center space-y-3 animate-pulse">
            <div className="w-20 h-20 rounded-full bg-emerald-500/30 flex items-center justify-center mx-auto">
              <span className="text-4xl">✓</span>
            </div>
            <p className="text-white font-semibold text-lg">¡QR detectado!</p>
            <p className="text-white/60 text-sm">Redirigiendo...</p>
          </div>
        )}

        {/* Active — viewfinder frame */}
        {status === 'active' && (
          <div className="flex flex-col items-center gap-6">
            {/* Scanning frame with corner brackets */}
            <div className="relative w-64 h-64">
              {/* Dimmed overlay with hole */}
              <div className="absolute inset-0 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              {/* Corner marks */}
              {['top-0 left-0 border-b-0 border-r-0 rounded-tl-xl',
                'top-0 right-0 border-b-0 border-l-0 rounded-tr-xl',
                'bottom-0 left-0 border-t-0 border-r-0 rounded-bl-xl',
                'bottom-0 right-0 border-t-0 border-l-0 rounded-br-xl',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-8 h-8 border-[3px] border-white ${cls}`} />
              ))}
              {/* Scan line animation */}
              <div className="absolute inset-x-4 top-1/2 h-0.5 bg-white/60 rounded-full animate-[scanline_2s_ease-in-out_infinite]" />
            </div>
            <p className="text-white/80 text-sm font-medium text-center px-8">
              Apunta hacia el código QR del gimnasio
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-safe pb-8 pt-4">
        <p className="text-white/30 text-xs px-8">
          El código QR está en la pantalla de la entrada del gimnasio
        </p>
      </footer>

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-40px); opacity: 0.3; }
          50%       { transform: translateY(40px);  opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
