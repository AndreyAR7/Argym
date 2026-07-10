'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

interface CheckinResultData {
  success: boolean
  already_checked_in: boolean
  xp_earned: number
  new_streak: number
  new_badges: string[]
  new_level: number
  error?: string
}

interface Props {
  result: CheckinResultData
}

// Lightweight confetti using canvas — no external dependency
function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#f97316']
    const pieces: {
      x: number; y: number; vx: number; vy: number
      size: number; color: string; rot: number; rotV: number; alpha: number
    }[] = []

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.15,
        alpha: 1,
      })
    }

    let rafId: number
    let started = Date.now()

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const elapsed = (Date.now() - started) / 1000

      for (const p of pieces) {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotV
        p.vy += 0.05 // gravity
        if (elapsed > 1.5) p.alpha = Math.max(0, p.alpha - 0.012)

        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
        ctx.restore()
      }

      if (pieces.some((p) => p.alpha > 0)) {
        rafId = requestAnimationFrame(draw)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [active])

  return canvasRef
}

export function CheckinResult({ result }: Props) {
  const isNew = result?.success && !result?.already_checked_in
  const alreadyIn = result?.already_checked_in
  const wrongGym = !result?.success && result?.error === 'branch_not_in_tenant'
  const confettiRef = useConfetti(isNew)

  if (wrongGym) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-destructive)]/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">QR de otro gimnasio</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Este código QR pertenece a una sucursal que no es de tu gimnasio. Solo puedes hacer check-in en las sucursales de tu gimnasio registrado.
          </p>
          <Link
            href="/client/inicio"
            className="inline-block rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  if (alreadyIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <span className="text-3xl">✓</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                Ya hiciste check-in hoy
              </h1>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Tu asistencia de hoy ya fue registrada.
              </p>
            </div>
            {result.new_streak > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
                <span className="text-xl">🔥</span>
                <span>{result.new_streak} días de racha</span>
              </div>
            )}
            <Link
              href="/client/inicio"
              className="inline-block w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors mt-2"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isNew) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4 overflow-hidden">
        {/* Confetti canvas */}
        <canvas
          ref={confettiRef}
          className="pointer-events-none fixed inset-0 z-10"
          aria-hidden="true"
        />

        {/* Celebration card */}
        <div className="relative z-20 w-full max-w-sm">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            {/* Gradient header */}
            <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 px-8 pt-10 pb-8 text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center mx-auto ring-4 ring-white/20">
                <span className="text-4xl">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white/70 uppercase tracking-wider">Check-in exitoso</p>
                <h1 className="mt-1 text-3xl font-bold text-white">¡Bienvenido!</h1>
              </div>

              {/* XP badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 border border-amber-400/30 px-5 py-2">
                <span className="text-2xl font-black text-amber-300">+{result.xp_earned}</span>
                <span className="text-sm font-semibold text-amber-200">XP</span>
              </div>
            </div>

            {/* Stats section */}
            <div className="bg-[var(--color-card)] border-t-0 border border-[var(--color-border)] rounded-b-2xl px-8 py-6 space-y-4">
              {/* Streak */}
              {result.new_streak > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🔥</span>
                    <span className="text-sm font-medium text-[var(--color-foreground)]">Racha actual</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--color-foreground)]">
                    {result.new_streak} {result.new_streak === 1 ? 'día' : 'días'}
                  </span>
                </div>
              )}

              {/* Level */}
              {result.new_level > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">⭐</span>
                    <span className="text-sm font-medium text-[var(--color-foreground)]">Nivel</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--color-foreground)]">
                    {result.new_level}
                  </span>
                </div>
              )}

              {/* New badges */}
              {result.new_badges && result.new_badges.length > 0 && (
                <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                    🏅 Insignias desbloqueadas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.new_badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href="/client/inicio"
                className="block w-full text-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity mt-2"
              >
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback — success=false but no specific error
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[var(--color-destructive)]/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">No se pudo registrar</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Ocurrió un problema al registrar tu check-in. Contacta al staff.
        </p>
        <Link
          href="/client/inicio"
          className="inline-block rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
