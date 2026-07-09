'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  related_entity_id: string | null
  related_entity_type: string | null
}

const TYPE_ICON: Record<string, string> = {
  appointment_confirmed: '📅',
  appointment_cancelled: '❌',
  appointment_created:   '📋',
  subscription_expiring: '⚠️',
  plan_purchased:        '💳',
  plan_expired:          '🔔',
  user_approved:         '✅',
  challenge_invited:     '⚔️',
  checkin_streak:        '🔥',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

interface Props {
  userId: string
}

export function NotificationBell({ userId }: Props) {
  const [open, setOpen]               = useState(false)
  const [notifications, setNotifs]    = useState<Notification[]>([])
  const [unread, setUnread]           = useState(0)
  const [loading, setLoading]         = useState(true)
  const panelRef                      = useRef<HTMLDivElement>(null)
  const supabase                      = createClient()

  // ── Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, type, is_read, created_at, related_entity_id, related_entity_type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (cancelled) return
      const list = (data ?? []) as Notification[]
      setNotifs(list)
      setUnread(list.filter(n => !n.is_read).length)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription ─────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification
          setNotifs(prev => [n, ...prev].slice(0, 20))
          setUnread(prev => prev + 1)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          setNotifs(prev => prev.map(n => n.id === updated.id ? updated : n))
          setUnread(prev => updated.is_read ? Math.max(0, prev - 1) : prev)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close on outside click ────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // ── Mark all read when panel opens ───────────────────────────────
  async function handleOpen() {
    setOpen(v => !v)
    if (open) return
    if (unread === 0) return

    // Optimistic update
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
  }

  async function markOneRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-muted)]"
        style={{ color: 'var(--color-foreground)' }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-80 rounded-xl shadow-xl border overflow-hidden z-50 flex flex-col"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            maxHeight: '420px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <Bell size={14} style={{ color: 'var(--color-muted-foreground)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                Notificaciones
              </p>
              {unread > 0 && (
                <span className="rounded-full bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5">
                  {unread}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--color-muted)]"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <X size={13} />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-foreground)] animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckCheck size={24} style={{ color: 'var(--color-border)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                  Sin notificaciones
                </p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markOneRead(n.id)}
                  className={[
                    'w-full text-left flex items-start gap-3 px-4 py-3 border-b transition-colors hover:bg-[var(--color-muted)]',
                    !n.is_read ? 'bg-[var(--color-muted)]/40' : '',
                  ].join(' ')}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className="text-lg leading-none flex-shrink-0 mt-0.5">
                    {TYPE_ICON[n.type] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-xs font-semibold leading-snug truncate"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p
                      className="text-xs mt-0.5 line-clamp-2"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    >
                      {n.message}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2.5 border-t flex-shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                onClick={async () => {
                  setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
                  setUnread(0)
                  await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
                }}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                <Check size={12} />
                Marcar todas como leídas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
