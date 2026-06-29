'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createChallengeAction } from '../actions'

type ChallengeType = 'global' | '1v1' | 'group'
type ExpiresIn = '1w' | '2w' | '1m' | null

const CHALLENGE_TYPES: { value: ChallengeType; emoji: string; label: string; description: string }[] = [
  { value: 'global', emoji: '🌍', label: 'Global', description: 'Todos los miembros del gimnasio' },
  { value: '1v1', emoji: '⚔️', label: '1 vs 1', description: 'Reta a otro miembro directamente' },
  { value: 'group', emoji: '👥', label: 'Grupo', description: 'Reto para un grupo de personas' },
]

const XP_OPTIONS = [50, 100, 150, 200]

const EXPIRES_OPTIONS: { value: ExpiresIn; label: string }[] = [
  { value: '1w', label: '1 semana' },
  { value: '2w', label: '2 semanas' },
  { value: '1m', label: '1 mes' },
  { value: null, label: 'Sin límite' },
]

export default function NuevoRetoPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [challengeType, setChallengeType] = useState<ChallengeType>('global')
  const [xpReward, setXpReward] = useState<number>(100)
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('1w')
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTitleError(null)

    if (!title.trim()) {
      setTitleError('El título es obligatorio.')
      return
    }

    startTransition(async () => {
      const result = await createChallengeAction({
        title: title.trim(),
        description: description.trim(),
        challengeType,
        xpReward,
        expiresIn,
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
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Retos
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Crear Reto</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (titleError) setTitleError(null)
              }}
              maxLength={80}
              placeholder="Escribe el nombre del reto…"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition ${
                titleError ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {titleError && (
              <p className="mt-1 text-xs text-red-500">{titleError}</p>
            )}
            <p className="mt-1 text-xs text-gray-400 text-right">{title.length}/80</p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Descripción <span className="normal-case font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Describe el objetivo del reto…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-client)] transition resize-none"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">{description.length}/300</p>
          </div>

          {/* Tipo de reto */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Tipo de reto
            </label>
            <div className="space-y-2">
              {CHALLENGE_TYPES.map((ct) => {
                const isActive = challengeType === ct.value
                return (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setChallengeType(ct.value)}
                    className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-[var(--color-client)] bg-[var(--color-client-light)]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className="text-xl leading-none">{ct.emoji}</span>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? 'text-[var(--color-client)]' : 'text-gray-800'}`}>
                        {ct.label}
                      </p>
                      <p className="text-xs text-gray-500">{ct.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Recompensa XP */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
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
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
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
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
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
            {isPending ? 'Creando reto…' : 'Crear Reto'}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
      </form>
    </div>
  )
}
