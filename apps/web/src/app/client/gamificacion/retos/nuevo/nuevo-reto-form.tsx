'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, X } from 'lucide-react'
import { createChallengeAction, getTenantMembersAction } from '../../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChallengeType = 'global' | '1v1' | 'group'
type ExpiresIn    = '1w' | '2w' | '1m' | null

interface Member {
  id: string
  full_name: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHALLENGE_TYPES: { value: ChallengeType; emoji: string; label: string; description: string }[] = [
  { value: 'global', emoji: '🌍', label: 'Global',  description: 'Todos los miembros del gimnasio' },
  { value: '1v1',    emoji: '⚔️',  label: '1 vs 1', description: 'Reta a otro miembro directamente' },
  { value: 'group',  emoji: '👥', label: 'Grupo',   description: 'Reto para un grupo de personas' },
]

const XP_OPTIONS = [50, 100, 150, 200]

const EXPIRES_OPTIONS: { value: ExpiresIn; label: string }[] = [
  { value: '1w',  label: '1 semana'  },
  { value: '2w',  label: '2 semanas' },
  { value: '1m',  label: '1 mes'     },
  { value: null,  label: 'Sin límite'},
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// ─── Opponent Picker ──────────────────────────────────────────────────────────

function OpponentPicker({
  selected,
  onSelect,
  error,
}: {
  selected: Member | null
  onSelect: (m: Member | null) => void
  error: string | null
}) {
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(false)
  const [query, setQuery]       = useState('')
  const [open, setOpen]         = useState(false)
  const panelRef                = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    getTenantMembersAction().then((data) => {
      setMembers(data)
      setLoading(false)
    })
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = query.trim()
    ? members.filter(m => m.full_name.toLowerCase().includes(query.toLowerCase()))
    : members

  if (selected) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-[var(--color-client)] bg-[var(--color-client-light)] px-4 py-3"
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{ backgroundColor: 'var(--color-client)', color: '#fff' }}
        >
          {initials(selected.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--color-foreground)] truncate">{selected.full_name}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Oponente seleccionado</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex-shrink-0 rounded-full p-1 hover:bg-[var(--color-muted)] transition-colors"
          aria-label="Cambiar oponente"
        >
          <X size={16} className="text-[var(--color-muted-foreground)]" />
        </button>
      </div>
    )
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Search input */}
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${error ? 'border-red-400' : 'border-[var(--color-border)]'} bg-[var(--color-card)]`}>
        <Search size={16} className="text-[var(--color-muted-foreground)] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          placeholder={loading ? 'Cargando miembros…' : 'Buscar miembro…'}
          disabled={loading}
          className="flex-1 text-sm bg-transparent outline-none text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)]"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              {loading ? 'Cargando…' : 'Sin resultados'}
            </p>
          ) : (
            filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m)
                  setOpen(false)
                  setQuery('')
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-[var(--color-muted)]/60 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-client-light)', color: 'var(--color-client)' }}
                >
                  {initials(m.full_name)}
                </div>
                <span className="text-sm font-medium text-[var(--color-foreground)] truncate">{m.full_name}</span>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function NuevoRetoForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title,         setTitle]         = useState('')
  const [description,   setDescription]   = useState('')
  const [challengeType, setChallengeType] = useState<ChallengeType>('global')
  const [xpReward,      setXpReward]      = useState<number>(100)
  const [expiresIn,     setExpiresIn]     = useState<ExpiresIn>('1w')
  const [opponent,      setOpponent]      = useState<Member | null>(null)

  const [error,         setError]         = useState<string | null>(null)
  const [titleError,    setTitleError]    = useState<string | null>(null)
  const [opponentError, setOpponentError] = useState<string | null>(null)

  function handleTypeChange(type: ChallengeType) {
    setChallengeType(type)
    setOpponentError(null)
    if (type !== '1v1') setOpponent(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTitleError(null)
    setOpponentError(null)

    let hasError = false

    if (!title.trim()) {
      setTitleError('El título es obligatorio.')
      hasError = true
    }

    if (challengeType === '1v1' && !opponent) {
      setOpponentError('Selecciona al oponente para el reto 1v1.')
      hasError = true
    }

    if (hasError) return

    startTransition(async () => {
      const result = await createChallengeAction({
        title:         title.trim(),
        description:   description.trim(),
        challengeType,
        xpReward,
        expiresIn,
        opponentId:    opponent?.id,
      })

      if (result.success) {
        router.push('/client/gamificacion/retos')
      } else {
        setError(result.error ?? 'Ocurrió un error al crear el reto.')
      }
    })
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8">
      {/* Back link */}
      <Link
        href="/client/gamificacion/retos"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Retos
      </Link>

      <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-6">Crear Reto</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-6">

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(null) }}
              maxLength={80}
              placeholder="Escribe el nombre del reto…"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition ${titleError ? 'border-red-400' : 'border-[var(--color-border)]'}`}
            />
            {titleError && <p className="mt-1 text-xs text-red-500">{titleError}</p>}
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)] text-right">{title.length}/80</p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-1.5">
              Descripción <span className="normal-case font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Describe el objetivo del reto…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition resize-none"
            />
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)] text-right">{description.length}/300</p>
          </div>

          {/* Tipo de reto */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2">
              Tipo de reto
            </label>
            <div className="space-y-2">
              {CHALLENGE_TYPES.map((ct) => {
                const isActive = challengeType === ct.value
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => handleTypeChange(ct.value)}
                    className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-[var(--color-client)] bg-[var(--color-client-light)]'
                        : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-muted-foreground)]/40'
                    }`}
                  >
                    <span className="text-xl leading-none">{ct.emoji}</span>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? 'text-[var(--color-client)]' : 'text-[var(--color-foreground)]'}`}>
                        {ct.label}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{ct.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Opponent picker (only for 1v1) ────────────────────────────── */}
          {challengeType === '1v1' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2">
                Oponente ⚔️
              </label>
              <OpponentPicker
                selected={opponent}
                onSelect={(m) => { setOpponent(m); setOpponentError(null) }}
                error={opponentError}
              />
            </div>
          )}

          {/* Recompensa XP */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2">
              Recompensa XP
            </label>
            <div className="flex flex-wrap gap-2">
              {XP_OPTIONS.map((xp) => {
                const isActive = xpReward === xp
                return (
                  <button
                    key={xp}
                    type="button"
                    onClick={() => setXpReward(xp)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                      isActive
                        ? 'bg-[var(--color-client)] text-white border-[var(--color-client)]'
                        : 'bg-[var(--color-card)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-muted-foreground)]/60'
                    }`}
                  >
                    {xp} XP
                  </button>
                )
              })}
            </div>
          </div>

          {/* Vence en */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2">
              Vence en
            </label>
            <div className="flex flex-wrap gap-2">
              {EXPIRES_OPTIONS.map((opt) => {
                const isActive = expiresIn === opt.value
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setExpiresIn(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                      isActive
                        ? 'bg-[var(--color-client)] text-white border-[var(--color-client)]'
                        : 'bg-[var(--color-card)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-muted-foreground)]/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* Submit */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--color-client)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isPending ? 'Creando reto…' : challengeType === '1v1' ? '⚔️ Lanzar reto' : 'Crear Reto'}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
      </form>
    </div>
  )
}
