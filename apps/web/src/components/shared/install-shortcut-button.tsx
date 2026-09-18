'use client'

import { useEffect, useState } from 'react'
import { Smartphone, Share, SquarePlus, X, MoreVertical } from 'lucide-react'

// Chrome/Android fire this before showing their own install UI — capturing
// it lets us trigger that native prompt from our own button instead of
// waiting for the browser's spontaneous mini-infobar. Not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallShortcutButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const ua = window.navigator.userAgent
    setIsIOS(/iphone|ipad|ipod/i.test(ua))

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  // Already running as an installed shortcut — nothing left to offer.
  if (isStandalone) return null

  async function handleClick() {
    // iOS Safari has no install API at all — Apple only allows the manual
    // Share-sheet flow, so a real device always gets the instructions modal.
    if (isIOS) {
      setShowHelp(true)
      return
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setDeferredPrompt(null)
      return
    }
    // Android/desktop Chrome that hasn't fired beforeinstallprompt yet (or a
    // browser without the API) — fall back to the same generic instructions.
    setShowHelp(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--color-muted)]'
        }
        style={
          className
            ? undefined
            : { borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }
        }
      >
        <Smartphone size={15} />
        Generar acceso directo
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
                Agregar a tu pantalla de inicio
              </h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="rounded-lg p-1.5 transition hover:bg-[var(--color-muted)]"
                style={{ color: 'var(--color-muted-foreground)' }}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                <li className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: 'var(--color-admin-light)', color: 'var(--color-admin)' }}
                  >
                    1
                  </span>
                  <span className="flex items-center gap-1.5">
                    Tocá el ícono de compartir <Share size={14} style={{ color: 'var(--color-admin)' }} /> en la barra de Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: 'var(--color-admin-light)', color: 'var(--color-admin)' }}
                  >
                    2
                  </span>
                  <span className="flex items-center gap-1.5">
                    Elegí <SquarePlus size={14} style={{ color: 'var(--color-admin)' }} />{' '}
                    <b style={{ color: 'var(--color-foreground)' }}>&quot;Agregar a inicio&quot;</b>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: 'var(--color-admin-light)', color: 'var(--color-admin)' }}
                  >
                    3
                  </span>
                  <span>
                    Confirmá el nombre y tocá <b style={{ color: 'var(--color-foreground)' }}>&quot;Agregar&quot;</b>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                <li className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: 'var(--color-admin-light)', color: 'var(--color-admin)' }}
                  >
                    1
                  </span>
                  <span className="flex items-center gap-1.5">
                    Abrí el menú de tu navegador <MoreVertical size={14} style={{ color: 'var(--color-admin)' }} />.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: 'var(--color-admin-light)', color: 'var(--color-admin)' }}
                  >
                    2
                  </span>
                  <span>
                    Elegí <b style={{ color: 'var(--color-foreground)' }}>&quot;Instalar app&quot;</b> o{' '}
                    <b style={{ color: 'var(--color-foreground)' }}>&quot;Agregar a pantalla de inicio&quot;</b>.
                  </span>
                </li>
              </ol>
            )}

            <p className="mt-5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              El ícono queda en tu pantalla de inicio como una app — al abrirlo entra directo al inicio de sesión.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
