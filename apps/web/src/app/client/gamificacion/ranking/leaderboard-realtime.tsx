'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface LeaderboardRow {
  rank: number
  user_id: string
  full_name: string
  level: number
  xp_total: number
  xp_this_week: number
  xp_this_month: number
  current_streak: number
  total_checkins: number
  total_challenges_won: number
  is_me: boolean
}

type Periodo = 'semana' | 'mes' | 'total'
type RpcPeriod = 'week' | 'month' | 'all'

const PERIOD_MAP: Record<Periodo, RpcPeriod> = {
  semana: 'week',
  mes:    'month',
  total:  'all',
}

const PERIOD_XP_KEY: Record<Periodo, keyof LeaderboardRow> = {
  semana: 'xp_this_week',
  mes:    'xp_this_month',
  total:  'xp_total',
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl leading-none">🥇</span>
  if (rank === 2) return <span className="text-xl leading-none">🥈</span>
  if (rank === 3) return <span className="text-xl leading-none">🥉</span>
  return (
    <span className="text-sm font-bold tabular-nums text-[var(--color-muted-foreground)] w-7 text-center inline-block">
      {rank}
    </span>
  )
}

function TableRow({
  row,
  periodo,
  flash,
}: {
  row: LeaderboardRow
  periodo: Periodo
  flash: boolean
}) {
  const xpValue = row[PERIOD_XP_KEY[periodo]] as number
  const isTop3  = row.rank <= 3

  return (
    <tr
      className={[
        'border-b border-[var(--color-border)] transition-all duration-500',
        row.is_me
          ? 'bg-[var(--color-client-light)] border-l-2 border-l-[var(--color-client)]'
          : 'hover:bg-[var(--color-muted)]/40',
        flash ? 'bg-amber-50 dark:bg-amber-950/20' : '',
      ].join(' ')}
    >
      <td className="pl-4 pr-2 py-3 w-10 text-center">
        <RankMedal rank={row.rank} />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{ backgroundColor: 'var(--color-client-light)', color: 'var(--color-client)' }}
          >
            {initials(row.full_name)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={['text-sm', row.is_me || isTop3 ? 'font-bold' : 'font-medium', 'text-[var(--color-foreground)]'].join(' ')}>
              {row.full_name}
            </span>
            {row.is_me && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-client)', color: '#fff' }}>
                Tú
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 hidden sm:table-cell">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--color-client)', color: 'var(--color-client)' }}>
          Nv. {row.level}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        <span className={['text-sm font-black tabular-nums transition-colors', flash ? 'text-amber-500' : ''].join(' ')} style={flash ? {} : { color: 'var(--color-client)' }}>
          ⚡ {xpValue.toLocaleString('es-CR')}
        </span>
      </td>
      <td className="px-4 py-3 text-right hidden md:table-cell">
        {row.current_streak > 0 && (
          <span className="text-sm font-semibold text-amber-500 tabular-nums">
            🔥 {row.current_streak}
          </span>
        )}
      </td>
    </tr>
  )
}

function MobileCard({ row, periodo, flash }: { row: LeaderboardRow; periodo: Periodo; flash: boolean }) {
  const xpValue = row[PERIOD_XP_KEY[periodo]] as number

  return (
    <div
      className={[
        'rounded-xl border p-3 flex items-center gap-3 transition-all duration-500',
        row.is_me
          ? 'bg-[var(--color-client-light)] border-[var(--color-client)] border-l-4'
          : flash
            ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-700'
            : 'bg-[var(--color-card)] border-[var(--color-border)]',
      ].join(' ')}
    >
      <div className="w-8 flex items-center justify-center flex-shrink-0">
        <RankMedal rank={row.rank} />
      </div>
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{ backgroundColor: 'var(--color-client-light)', color: 'var(--color-client)' }}>
        {initials(row.full_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={['text-sm leading-tight truncate', row.is_me ? 'font-bold' : 'font-medium', 'text-[var(--color-foreground)]'].join(' ')}>
            {row.full_name}
          </span>
          {row.is_me && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-client)', color: '#fff' }}>
              Tú
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full border" style={{ borderColor: 'var(--color-client)', color: 'var(--color-client)' }}>
            Nv. {row.level}
          </span>
          {row.current_streak > 0 && (
            <span className="text-xs font-semibold text-amber-500">🔥 {row.current_streak}</span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={['text-sm font-black tabular-nums transition-colors', flash ? 'text-amber-500' : ''].join(' ')} style={flash ? {} : { color: 'var(--color-client)' }}>
          ⚡ {xpValue.toLocaleString('es-CR')}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)]">XP</p>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

interface Props {
  initialRows: LeaderboardRow[]
  tenantId: string
  periodo: Periodo
}

export function LeaderboardRealtime({ initialRows, tenantId, periodo }: Props) {
  const [rows, setRows]         = useState<LeaderboardRow[]>(initialRows)
  const [isLive, setIsLive]     = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set())
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase                = createClient()

  const refresh = useCallback(async (changedUserId?: string) => {
    setRefreshing(true)
    const { data } = await supabase.rpc('get_leaderboard', {
      p_tenant_id: tenantId,
      p_period:    PERIOD_MAP[periodo],
      p_limit:     50,
    })
    setRefreshing(false)

    if (!data) return
    setRows(data as LeaderboardRow[])

    if (changedUserId) {
      setFlashedIds(new Set([changedUserId]))
      setTimeout(() => setFlashedIds(new Set()), 2500)
    }
  }, [tenantId, periodo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch when periodo changes ──────────────────────────────
  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  // ── Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`leaderboard:tenant:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'user_game_stats',
          // Note: tenant_id filter on user_game_stats — fires for any member's XP change
        },
        (payload) => {
          const changedUserId = payload.new.user_id as string

          // Debounce: if multiple users gain XP at once (batch checkin etc.) wait 600ms
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            refresh(changedUserId)
          }, 600)
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'user_game_stats',
        },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => refresh(), 600)
        },
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [tenantId, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const meRow = rows.find(r => r.is_me)
  const xpKey = PERIOD_XP_KEY[periodo]

  return (
    <>
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={['w-2 h-2 rounded-full flex-shrink-0', isLive ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--color-border)]'].join(' ')}
          />
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {isLive ? 'En vivo' : 'Conectando…'}
          </span>
        </div>
        {refreshing && (
          <span className="text-xs text-[var(--color-muted-foreground)] animate-pulse">
            Actualizando…
          </span>
        )}
      </div>

      {/* Empty */}
      {rows.length === 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Sin datos de ranking aún.
          </p>
        </div>
      )}

      {/* Desktop table */}
      {rows.length > 0 && (
        <div className="hidden sm:block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="pl-4 pr-2 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider w-10">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Atleta</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden sm:table-cell">Nivel</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">XP</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Racha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <TableRow
                  key={row.user_id}
                  row={row}
                  periodo={periodo}
                  flash={flashedIds.has(row.user_id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {rows.length > 0 && (
        <div className="sm:hidden space-y-2">
          {rows.map(row => (
            <MobileCard
              key={row.user_id}
              row={row}
              periodo={periodo}
              flash={flashedIds.has(row.user_id)}
            />
          ))}
        </div>
      )}

      {/* My position card */}
      {meRow && (
        <div
          className="rounded-xl border p-3 flex items-center gap-3"
          style={{ borderColor: 'var(--color-client)', backgroundColor: 'var(--color-client-light)' }}
        >
          <span className="text-lg">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--color-foreground)]">Tu posición</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Puesto #{meRow.rank} · ⚡ {(meRow[xpKey] as number).toLocaleString('es-CR')} XP
            </p>
          </div>
          <RankMedal rank={meRow.rank} />
        </div>
      )}
    </>
  )
}
