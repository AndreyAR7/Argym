'use client'

import { useState, useTransition, useEffect } from 'react'
import { CalendarClock, Copy, Check, RefreshCw } from 'lucide-react'
import { getCalendarSyncUrlAction, rotateCalendarSyncUrlAction } from '@/lib/shared/calendar-sync-actions'

export function CalendarSyncCard() {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getCalendarSyncUrlAction()
      if (result.error) setError(result.error)
      else setUrl(result.url ?? null)
    })
  }, [])

  function handleCopy() {
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRotate() {
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const result = await rotateCalendarSyncUrlAction()
      if (result.error) setError(result.error)
      else setUrl(result.url ?? null)
    })
  }

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <CalendarClock size={16} style={{ color: 'var(--color-muted-foreground)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Sincronizar calendario</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
        Copia este enlace y agrégalo como calendario &ldquo;por URL&rdquo; en Google Calendar, Apple Calendar u Outlook para ver tus citas automáticamente. Se actualiza solo, no necesitas volver a importarlo.
      </p>

      {error && (
        <p className="text-xs mb-3" style={{ color: 'var(--color-destructive)' }}>{error}</p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={isPending && !url ? 'Generando enlace…' : url ?? ''}
          onFocus={e => e.currentTarget.select()}
          className="flex-1 min-w-0 rounded-lg px-3 py-2 text-xs font-mono outline-none"
          style={{ backgroundColor: 'var(--color-input)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
        />
        <button
          type="button" onClick={handleCopy} disabled={!url || isPending}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-admin)', color: 'var(--color-primary-foreground)' }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <button
        type="button" onClick={handleRotate} disabled={isPending}
        className="mt-3 flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity disabled:opacity-50"
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        <RefreshCw size={12} />
        Generar un enlace nuevo (invalida el anterior)
      </button>
    </div>
  )
}
