'use client'

import { Suspense, useState, useEffect, useTransition, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Stage = 'exchanging' | 'form' | 'success' | 'error'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Always start in 'exchanging' — we check ALL token sources in useEffect
  const [stage, setStage] = useState<Stage>('exchanging')
  const [errorMsg, setErrorMsg] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formError, setFormError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Guard against React Strict Mode double-invocation in development
  const exchangedRef = useRef(false)

  useEffect(() => {
    if (exchangedRef.current) return
    exchangedRef.current = true

    const supabase = createClient()

    // ── 1. Token-hash flow (newer Supabase email templates) ──
    // URL: /reset-password?token_hash=XXX&type=recovery
    const tokenHash = searchParams.get('token_hash')
    const tokenType = searchParams.get('type')
    if (tokenHash && tokenType === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (error) {
          console.error('[reset] verifyOtp:', error.message)
          setErrorMsg('El enlace de recuperación ha expirado o ya fue utilizado. Solicita uno nuevo.')
          setStage('error')
        } else {
          setStage('form')
        }
      })
      return
    }

    // ── 2. PKCE flow (default @supabase/ssr) ──
    // URL: /reset-password?code=XXX
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('[reset] exchangeCodeForSession:', error.message)
          setErrorMsg('El enlace de recuperación ha expirado o ya fue utilizado. Solicita uno nuevo.')
          setStage('error')
        } else {
          setStage('form')
        }
      })
      return
    }

    // ── 3. Implicit flow (older Supabase projects) ──
    // URL: /reset-password#access_token=XXX&refresh_token=XXX&type=recovery
    // Hash fragments are not server-visible; read them from window only.
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.slice(1)) // drop leading '#'
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const hashType = params.get('type')

      if (hashType === 'recovery' && accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
          if (error) {
            console.error('[reset] setSession:', error.message)
            setErrorMsg('El enlace de recuperación ha expirado o ya fue utilizado. Solicita uno nuevo.')
            setStage('error')
          } else {
            setStage('form')
          }
        })
        return
      }
    }

    // No valid token found in any location
    setErrorMsg('No se encontró un enlace de recuperación válido. Solicita uno nuevo.')
    setStage('error')
  }, [searchParams])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (newPw.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPw !== confirmPw) {
      setFormError('Las contraseñas no coinciden')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) {
        setFormError(error.message)
      } else {
        await supabase.auth.signOut()
        setStage('success')
      }
    })
  }

  const inputCls = 'w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] px-3.5 py-2.5 pl-9 pr-10 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none transition-all focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20 disabled:opacity-50'

  if (stage === 'exchanging') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 size={32} className="animate-spin text-[var(--color-muted-foreground)]" />
        <p className="text-sm text-[var(--color-muted-foreground)]">Verificando enlace…</p>
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            Enlace inválido
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)] max-w-xs leading-relaxed">
            {errorMsg || 'Este enlace de recuperación no es válido.'}
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="w-full flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    )
  }

  if (stage === 'success') {
    return (
      <div>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            ¡Contraseña actualizada!
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Tu contraseña fue cambiada exitosamente.
          </p>
        </div>
        <Link
          href="/login"
          className="w-full flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
        >
          Iniciar sesión
        </Link>
      </div>
    )
  }

  // stage === 'form'
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Nueva contraseña
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Elige una contraseña segura de al menos 8 caracteres
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 px-4 py-3">
            <p className="text-sm text-[var(--color-destructive)]">{formError}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="new-pw" className="block text-sm font-medium text-[var(--color-foreground)]">
            Nueva contraseña
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              id="new-pw"
              type={showNew ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              disabled={isPending}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-pw" className="block text-sm font-medium text-[var(--color-foreground)]">
            Confirmar contraseña
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              id="confirm-pw"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              minLength={8}
              placeholder="Repite la contraseña"
              disabled={isPending}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Password strength hint */}
        {newPw.length > 0 && (
          <div className="flex gap-1 items-center">
            {[8, 12, 16].map((len) => (
              <div
                key={len}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor: newPw.length >= len
                    ? newPw.length >= 16 ? '#22c55e' : newPw.length >= 12 ? '#f59e0b' : '#ef4444'
                    : 'var(--color-muted)',
                }}
              />
            ))}
            <span className="text-[10px] text-[var(--color-muted-foreground)] ml-1 leading-tight">
              {newPw.length >= 16 ? 'Fuerte' : newPw.length >= 12 ? 'Media' : 'Débil'}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isPending ? 'Guardando…' : 'Establecer nueva contraseña'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 size={32} className="animate-spin text-[var(--color-muted-foreground)]" />
        <p className="text-sm text-[var(--color-muted-foreground)]">Cargando…</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
