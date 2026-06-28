'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue>({ confirm: async () => false })

interface DialogState extends ConfirmOptions {
  open: boolean
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({
    open: false,
    title: '',
    message: '',
  })
  const resolverRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setState({ ...opts, open: true })
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve
    })
  }, [])

  function respond(value: boolean) {
    setState(prev => ({ ...prev, open: false }))
    resolverRef.current?.(value)
    resolverRef.current = null
  }

  const isDanger = state.variant === 'danger'

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {state.open && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => respond(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            {isDanger && (
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 12%, transparent)' }}
              >
                <AlertTriangle size={22} style={{ color: 'var(--color-destructive)' }} />
              </div>
            )}

            {/* Title */}
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--color-foreground)' }}
            >
              {state.title}
            </h3>

            {/* Message */}
            <p
              className="mt-1.5 text-sm"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              {state.message}
            </p>

            {/* Buttons */}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => respond(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              >
                {state.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                onClick={() => respond(true)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: isDanger ? 'var(--color-destructive)' : 'var(--color-primary)',
                  color: '#fff',
                }}
              >
                {state.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}
