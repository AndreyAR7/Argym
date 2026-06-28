'use client'

import { useState, useTransition } from 'react'
import { Video, Apple, Plus, X, Loader2 } from 'lucide-react'

export interface ContentItem {
  id: string
  title?: string
  name?: string
  status: string
}

interface ContentSectionProps {
  title: string
  icon: React.ElementType
  iconColor: string
  assigned: ContentItem[]
  available: ContentItem[]
  onAdd: (item: ContentItem) => void
  onRemove: (item: ContentItem) => void
  isPending: boolean
  emptyAssigned: string
  emptyAvailable: string
  addLabel: string
}

function getLabel(item: ContentItem) {
  return item.title ?? item.name ?? item.id
}

function ContentSection({
  title, icon: Icon, iconColor, assigned, available,
  onAdd, onRemove, isPending, emptyAssigned, emptyAvailable, addLabel,
}: ContentSectionProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = available.filter(item =>
    getLabel(item).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <h2 className="font-semibold text-[var(--color-foreground)]">{title}</h2>
          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            {assigned.length}
          </span>
        </div>
        {isPending && <Loader2 size={14} className="animate-spin text-[var(--color-muted-foreground)]" />}
      </div>

      <div className="p-4 space-y-2">
        {assigned.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)] italic">{emptyAssigned}</p>
        ) : (
          assigned.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--color-muted)] border border-[var(--color-border)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={12} className={`${iconColor} flex-shrink-0`} />
                <span className="text-sm text-[var(--color-foreground)] truncate">{getLabel(item)}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)] flex-shrink-0 capitalize">{item.status}</span>
              </div>
              <button
                onClick={() => onRemove(item)}
                disabled={isPending}
                className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {!showPicker ? (
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowPicker(true)}
            disabled={available.length === 0}
            className="flex items-center gap-1.5 text-sm text-[var(--color-admin)] hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            {available.length === 0 ? `${addLabel} (ninguno disponible)` : addLabel}
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4 border-t border-[var(--color-border)]">
          <div className="pt-3 space-y-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {filtered.length === 0 ? (
                <p className="text-xs text-[var(--color-muted-foreground)] py-3 text-center">{emptyAvailable}</p>
              ) : (
                filtered.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { onAdd(item); setShowPicker(false); setSearch('') }}
                    disabled={isPending}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-50"
                  >
                    <Plus size={12} className="text-[var(--color-admin)] flex-shrink-0" />
                    <span className="flex-1 truncate">{getLabel(item)}</span>
                    <span className="text-xs text-[var(--color-muted-foreground)] capitalize">{item.status}</span>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => { setShowPicker(false); setSearch('') }}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface PlanContentManagerProps {
  planId: string
  assignedVideos: ContentItem[]
  assignedNutritions: ContentItem[]
  availableVideos: ContentItem[]
  availableNutritions: ContentItem[]
  addVideoAction: (planId: string, videoId: string) => Promise<{ error?: string; ok?: boolean }>
  removeVideoAction: (planId: string, videoId: string) => Promise<{ error?: string; ok?: boolean }>
  addNutritionAction: (planId: string, nutritionId: string) => Promise<{ error?: string; ok?: boolean }>
  removeNutritionAction: (planId: string, nutritionId: string) => Promise<{ error?: string; ok?: boolean }>
  entityId: string
}

export function ContentManager({
  entityId,
  assignedVideos,
  assignedNutritions,
  availableVideos,
  availableNutritions,
  addVideoAction,
  removeVideoAction,
  addNutritionAction,
  removeNutritionAction,
}: PlanContentManagerProps) {
  const [videos, setVideos] = useState({ assigned: assignedVideos, available: availableVideos })
  const [nutritions, setNutritions] = useState({ assigned: assignedNutritions, available: availableNutritions })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addVideo(video: ContentItem) {
    setVideos(prev => ({ assigned: [...prev.assigned, video], available: prev.available.filter(v => v.id !== video.id) }))
    startTransition(async () => {
      const res = await addVideoAction(entityId, video.id)
      if (res?.error) {
        setError(res.error)
        setVideos(prev => ({ assigned: prev.assigned.filter(v => v.id !== video.id), available: [...prev.available, video] }))
      }
    })
  }

  function removeVideo(video: ContentItem) {
    setVideos(prev => ({ assigned: prev.assigned.filter(v => v.id !== video.id), available: [...prev.available, video] }))
    startTransition(async () => {
      const res = await removeVideoAction(entityId, video.id)
      if (res?.error) {
        setError(res.error)
        setVideos(prev => ({ assigned: [...prev.assigned, video], available: prev.available.filter(v => v.id !== video.id) }))
      }
    })
  }

  function addNutrition(nutrition: ContentItem) {
    setNutritions(prev => ({ assigned: [...prev.assigned, nutrition], available: prev.available.filter(n => n.id !== nutrition.id) }))
    startTransition(async () => {
      const res = await addNutritionAction(entityId, nutrition.id)
      if (res?.error) {
        setError(res.error)
        setNutritions(prev => ({ assigned: prev.assigned.filter(n => n.id !== nutrition.id), available: [...prev.available, nutrition] }))
      }
    })
  }

  function removeNutrition(nutrition: ContentItem) {
    setNutritions(prev => ({ assigned: prev.assigned.filter(n => n.id !== nutrition.id), available: [...prev.available, nutrition] }))
    startTransition(async () => {
      const res = await removeNutritionAction(entityId, nutrition.id)
      if (res?.error) {
        setError(res.error)
        setNutritions(prev => ({ assigned: [...prev.assigned, nutrition], available: prev.available.filter(n => n.id !== nutrition.id) }))
      }
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <ContentSection
        title="Videos"
        icon={Video}
        iconColor="text-blue-600"
        assigned={videos.assigned}
        available={videos.available}
        onAdd={addVideo}
        onRemove={removeVideo}
        isPending={isPending}
        emptyAssigned="No hay videos asignados."
        emptyAvailable="No hay videos disponibles para agregar."
        addLabel="Agregar video"
      />

      <ContentSection
        title="Planes Nutricionales"
        icon={Apple}
        iconColor="text-emerald-600"
        assigned={nutritions.assigned}
        available={nutritions.available}
        onAdd={addNutrition}
        onRemove={removeNutrition}
        isPending={isPending}
        emptyAssigned="No hay planes nutricionales asignados."
        emptyAvailable="No hay planes nutricionales disponibles."
        addLabel="Agregar plan nutricional"
      />
    </div>
  )
}
