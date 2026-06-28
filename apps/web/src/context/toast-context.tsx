'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}

const STYLES: Record<ToastType, { border: string; icon: string; bg: string }> = {
  success: { border: '#22c55e', icon: '#22c55e', bg: 'color-mix(in srgb, #22c55e 8%, var(--color-card))' },
  error:   { border: 'var(--color-destructive)', icon: 'var(--color-destructive)', bg: 'color-mix(in srgb, var(--color-destructive) 8%, var(--color-card))' },
  warning: { border: '#f59e0b', icon: '#f59e0b', bg: 'color-mix(in srgb, #f59e0b 8%, var(--color-card))' },
  info:    { border: 'var(--color-primary)', icon: 'var(--color-primary)', bg: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-card))' },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[toast.type]
  const s = STYLES[toast.type]
  return (
    <div
      role="alert"
      className="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg min-w-[280px] max-w-sm"
      style={{ backgroundColor: s.bg, borderColor: s.border, borderLeftWidth: 4 }}
    >
      <Icon size={16} className="mt-0.5 flex-shrink-0" style={{ color: s.icon }} />
      <p className="flex-1 text-sm text-[var(--color-foreground)] leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-3), { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
