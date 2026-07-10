'use client'

import { useState, useTransition } from 'react'
import { Video, Apple, Dumbbell, Plus, X, Loader2, Save, Search, CheckCircle2 } from 'lucide-react'

export interface ContentItem {
  id: string
  title?: string
  name?: string
  status: string
}

function getLabel(item: ContentItem): string {
  return item.title ?? item.name ?? item.id
}

type Action = (entityId: string, itemId: string) => Promise<{ error?: string; ok?: boolean }>

interface SectionState {
  assigned: ContentItem[]
  available: ContentItem[]
  toAdd: ContentItem[]
  toRemoveIds: string[]
}

function ContentSection({
  title,
  icon: Icon,
  iconColor,
  accentBg,
  state,
  onAdd,
  onRemove,
  onUndoAdd,
  onUndoRemove,
  isPending,
  emptyLabel,
  addLabel,
}: {
  title: string
  icon: React.ElementType
  iconColor: string
  accentBg: string
  state: SectionState
  onAdd: (item: ContentItem) => void
  onRemove: (item: ContentItem) => void
  onUndoAdd: (id: string) => void
  onUndoRemove: (id: string) => void
  isPending: boolean
  emptyLabel: string
  addLabel: string
}) {
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const toRemoveSet = new Set(state.toRemoveIds)
  const toAddIds = new Set(state.toAdd.map(i => i.id))

  const q = search.toLowerCase()
  const matchesSearch = (item: ContentItem) => q === '' || getLabel(item).toLowerCase().includes(q)

  const visibleAssigned = state.assigned.filter(matchesSearch)
  const visibleToAdd = state.toAdd.filter(matchesSearch)

  // Available = base available minus items already staged to add
  const pickerItems = state.available
    .filter(i => !toAddIds.has(i.id))
    .filter(matchesSearch)

  const totalCount = state.assigned.length - state.toRemoveIds.length + state.toAdd.length
  const hasPending = state.toAdd.length > 0 || state.toRemoveIds.length > 0

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon size={16} className={iconColor} />
          <h2 className="font-semibold text-[var(--color-foreground)]">{title}</h2>
          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            {totalCount}
          </span>
          {hasPending && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {state.toAdd.length + state.toRemoveIds.length} sin guardar
            </span>
          )}
        </div>
        {isPending && <Loader2 size={14} className="animate-spin text-[var(--color-muted-foreground)]" />}
      </div>

      {/* Search bar — always visible, blur style */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Buscar en ${title.toLowerCase()}…`}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)]/70 backdrop-blur-md text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
          />
        </div>
      </div>

      {/* Item list */}
      <div className="px-4 pb-3 space-y-1.5">
        {visibleAssigned.length === 0 && visibleToAdd.length === 0 && (
          <p className="text-sm text-[var(--color-muted-foreground)] italic py-1">{emptyLabel}</p>
        )}

        {/* Saved items */}
        {visibleAssigned.map(item => {
          const isMarked = toRemoveSet.has(item.id)
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all ${
                isMarked
                  ? 'bg-red-50 border-red-200 opacity-60'
                  : 'bg-[var(--color-muted)] border-[var(--color-border)]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={12} className={`${iconColor} flex-shrink-0`} />
                <span className={`text-sm text-[var(--color-foreground)] truncate ${isMarked ? 'line-through' : ''}`}>
                  {getLabel(item)}
                </span>
                <span className="text-[10px] text-[var(--color-muted-foreground)] flex-shrink-0 capitalize">
                  {item.status}
                </span>
              </div>
              {isMarked ? (
                <button
                  onClick={() => onUndoRemove(item.id)}
                  className="text-xs text-amber-600 hover:text-amber-800 flex-shrink-0 font-medium transition-colors"
                >
                  Deshacer
                </button>
              ) : (
                <button
                  onClick={() => onRemove(item)}
                  disabled={isPending}
                  className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )
        })}

        {/* Staged additions */}
        {visibleToAdd.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-emerald-50 border-emerald-200"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icon size={12} className={`${iconColor} flex-shrink-0`} />
              <span className="text-sm text-[var(--color-foreground)] truncate">{getLabel(item)}</span>
              <span className="text-[10px] text-emerald-600 font-semibold flex-shrink-0">nuevo</span>
            </div>
            <button
              onClick={() => onUndoAdd(item.id)}
              disabled={isPending}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add picker */}
      <div className="px-4 pb-4">
        {!showPicker ? (
          <button
            onClick={() => setShowPicker(true)}
            disabled={pickerItems.length === 0 && search === ''}
            className="flex items-center gap-1.5 text-sm text-[var(--color-admin)] hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            {pickerItems.length === 0 && search === ''
              ? `${addLabel} (ninguno disponible)`
              : addLabel}
          </button>
        ) : (
          <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
            <div className={`max-h-52 overflow-y-auto rounded-lg border border-[var(--color-border)] ${accentBg} backdrop-blur-md divide-y divide-[var(--color-border)]/40`}>
              {pickerItems.length === 0 ? (
                <p className="text-xs text-[var(--color-muted-foreground)] py-4 text-center">
                  {search ? 'Sin resultados para esa búsqueda' : 'No hay más disponibles'}
                </p>
              ) : (
                pickerItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { onAdd(item); setShowPicker(false) }}
                    disabled={isPending}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-card)] transition-colors disabled:opacity-50"
                  >
                    <Plus size={12} className="text-[var(--color-admin)] flex-shrink-0" />
                    <span className="flex-1 truncate">{getLabel(item)}</span>
                    <span className="text-xs text-[var(--color-muted-foreground)] capitalize">{item.status}</span>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface ContentManagerProps {
  entityId: string
  assignedVideos: ContentItem[]
  assignedNutritions: ContentItem[]
  assignedRoutines: ContentItem[]
  availableVideos: ContentItem[]
  availableNutritions: ContentItem[]
  availableRoutines: ContentItem[]
  addVideoAction: Action
  removeVideoAction: Action
  addNutritionAction: Action
  removeNutritionAction: Action
  addRoutineAction: Action
  removeRoutineAction: Action
}

export function ContentManager({
  entityId,
  assignedVideos, assignedNutritions, assignedRoutines,
  availableVideos, availableNutritions, availableRoutines,
  addVideoAction, removeVideoAction,
  addNutritionAction, removeNutritionAction,
  addRoutineAction, removeRoutineAction,
}: ContentManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const [videos, setVideos] = useState<SectionState>({
    assigned: assignedVideos,
    available: availableVideos,
    toAdd: [],
    toRemoveIds: [],
  })
  const [routines, setRoutines] = useState<SectionState>({
    assigned: assignedRoutines,
    available: availableRoutines,
    toAdd: [],
    toRemoveIds: [],
  })
  const [nutritions, setNutritions] = useState<SectionState>({
    assigned: assignedNutritions,
    available: availableNutritions,
    toAdd: [],
    toRemoveIds: [],
  })

  const hasChanges =
    videos.toAdd.length > 0 || videos.toRemoveIds.length > 0 ||
    routines.toAdd.length > 0 || routines.toRemoveIds.length > 0 ||
    nutritions.toAdd.length > 0 || nutritions.toRemoveIds.length > 0

  function makeHandlers(setter: React.Dispatch<React.SetStateAction<SectionState>>) {
    return {
      add(item: ContentItem) {
        setter(prev => ({
          ...prev,
          toAdd: [...prev.toAdd, item],
          // if it was staged for removal, cancel that
          toRemoveIds: prev.toRemoveIds.filter(id => id !== item.id),
        }))
      },
      remove(item: ContentItem) {
        setter(prev => ({
          ...prev,
          toRemoveIds: [...prev.toRemoveIds, item.id],
        }))
      },
      undoAdd(id: string) {
        setter(prev => ({
          ...prev,
          toAdd: prev.toAdd.filter(i => i.id !== id),
        }))
      },
      undoRemove(id: string) {
        setter(prev => ({
          ...prev,
          toRemoveIds: prev.toRemoveIds.filter(rid => rid !== id),
        }))
      },
    }
  }

  const videoH = makeHandlers(setVideos)
  const routineH = makeHandlers(setRoutines)
  const nutritionH = makeHandlers(setNutritions)

  function handleSave() {
    setError(null)
    setSavedAt(null)
    startTransition(async () => {
      const ops: Promise<{ error?: string; ok?: boolean }>[] = []

      videos.toAdd.forEach(i => ops.push(addVideoAction(entityId, i.id)))
      videos.toRemoveIds.forEach(id => ops.push(removeVideoAction(entityId, id)))
      routines.toAdd.forEach(i => ops.push(addRoutineAction(entityId, i.id)))
      routines.toRemoveIds.forEach(id => ops.push(removeRoutineAction(entityId, id)))
      nutritions.toAdd.forEach(i => ops.push(addNutritionAction(entityId, i.id)))
      nutritions.toRemoveIds.forEach(id => ops.push(removeNutritionAction(entityId, id)))

      const results = await Promise.all(ops)
      const errors = results.filter(r => r?.error).map(r => r!.error)

      if (errors.length > 0) {
        setError(errors[0] ?? 'Error al guardar. Intenta de nuevo.')
        return
      }

      // Commit: apply staged changes to base state
      const applySection = (prev: SectionState): SectionState => {
        const removeSet = new Set(prev.toRemoveIds)
        const newAssigned = [
          ...prev.assigned.filter(i => !removeSet.has(i.id)),
          ...prev.toAdd,
        ]
        const newAddIds = new Set(prev.toAdd.map(i => i.id))
        const newAvailable = [
          ...prev.available.filter(i => !newAddIds.has(i.id)),
          ...prev.assigned.filter(i => removeSet.has(i.id)),
        ]
        return { assigned: newAssigned, available: newAvailable, toAdd: [], toRemoveIds: [] }
      }

      setVideos(applySection)
      setRoutines(applySection)
      setNutritions(applySection)
      setSavedAt(new Date())
    })
  }

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <ContentSection
        title="Videos"
        icon={Video}
        iconColor="text-blue-600"
        accentBg="bg-blue-50/70"
        state={videos}
        onAdd={videoH.add}
        onRemove={videoH.remove}
        onUndoAdd={videoH.undoAdd}
        onUndoRemove={videoH.undoRemove}
        isPending={isPending}
        emptyLabel="No hay videos asignados."
        addLabel="Agregar video"
      />

      <ContentSection
        title="Rutinas"
        icon={Dumbbell}
        iconColor="text-orange-600"
        accentBg="bg-orange-50/70"
        state={routines}
        onAdd={routineH.add}
        onRemove={routineH.remove}
        onUndoAdd={routineH.undoAdd}
        onUndoRemove={routineH.undoRemove}
        isPending={isPending}
        emptyLabel="No hay rutinas asignadas."
        addLabel="Agregar rutina"
      />

      <ContentSection
        title="Planes Nutricionales"
        icon={Apple}
        iconColor="text-emerald-600"
        accentBg="bg-emerald-50/70"
        state={nutritions}
        onAdd={nutritionH.add}
        onRemove={nutritionH.remove}
        onUndoAdd={nutritionH.undoAdd}
        onUndoRemove={nutritionH.undoRemove}
        isPending={isPending}
        emptyLabel="No hay planes nutricionales asignados."
        addLabel="Agregar plan nutricional"
      />

      {/* Save bar — sticky at bottom */}
      <div
        className={`sticky bottom-4 transition-all duration-300 ${
          hasChanges || savedAt ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/90 backdrop-blur-lg shadow-lg">
          <div className="text-sm text-[var(--color-muted-foreground)]">
            {savedAt && !hasChanges ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 size={14} />
                Cambios guardados
              </span>
            ) : (
              <span>Tienes cambios sin guardar</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-admin)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
