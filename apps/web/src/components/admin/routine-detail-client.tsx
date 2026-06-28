'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, Pencil, Trash2, Dumbbell, Play } from 'lucide-react'
import { ExerciseForm } from '@/components/admin/exercise-form'
import { VideoPlayerModal } from '@/components/admin/video-player-modal'
import { deleteExerciseAction } from '@/lib/admin/exercise-actions'
import { useConfirm } from '@/context/confirm-context'
import { useToast } from '@/context/toast-context'

interface Exercise {
  id: string
  name: string
  muscle: string
  sets: number
  reps: number
  rest_seconds: number
  notes: string | null
  sort_order: number
  demo_video_storage_path: string | null
  demo_video_bucket: string | null
}

export interface AvailableVideo {
  id: string
  title: string
  video_storage_path: string | null
  video_bucket: string | null
}

interface Props {
  routineId: string
  exercises: Exercise[]
  availableVideos: AvailableVideo[]
}

export function RoutineDetailClient({ routineId, exercises, availableVideos }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localExercises, setLocalExercises] = useState(exercises)
  const [playingVideo, setPlayingVideo] = useState<{ path: string; bucket: string; title: string } | null>(null)
  const { confirm } = useConfirm()
  const { showToast } = useToast()

  useEffect(() => {
    setLocalExercises(exercises)
  }, [exercises])

  function openAdd() {
    setEditingExercise(null)
    setFormOpen(true)
  }

  function openEdit(ex: Exercise) {
    setEditingExercise(ex)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingExercise(null)
  }

  function handleDelete(ex: Exercise) {
    startTransition(async () => {
      const ok = await confirm({
        title: 'Eliminar ejercicio',
        message: `¿Eliminar "${ex.name}"? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      setDeletingId(ex.id)
      setLocalExercises((prev) => prev.filter((e) => e.id !== ex.id))
      const result = await deleteExerciseAction(ex.id, routineId)
      if (result?.error) {
        setLocalExercises(exercises)
        showToast('error', `No se pudo eliminar: ${result.error}`)
      } else {
        showToast('success', `Ejercicio "${ex.name}" eliminado`)
      }
      setDeletingId(null)
    })
  }

  const nextSortOrder = localExercises.length > 0
    ? Math.max(...localExercises.map((e) => e.sort_order)) + 1
    : 1

  return (
    <>
      <div className="mt-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            Ejercicios ({localExercises.length})
          </h2>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Agregar ejercicio
          </button>
        </div>

        {/* Exercise table */}
        {localExercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
              <Dumbbell size={20} className="text-[var(--color-border)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Sin ejercicios</p>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
              Agrega el primer ejercicio a esta rutina.
            </p>
            <button
              onClick={openAdd}
              className="mt-4 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
            >
              Agregar ejercicio
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Ejercicio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Músculo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Series×Reps</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Descanso</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
                {localExercises.map((ex, idx) => (
                  <tr key={ex.id} className="hover:bg-[var(--color-muted)] transition-colors">
                    <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-foreground)]">{ex.name}</p>
                      {ex.notes && (
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-1">
                          {ex.notes}
                        </p>
                      )}
                      {ex.demo_video_storage_path && (
                        <button
                          onClick={() => setPlayingVideo({ path: ex.demo_video_storage_path!, bucket: ex.demo_video_bucket ?? 'videos', title: ex.name })}
                          className="mt-1 flex items-center gap-1 text-[10px] font-medium text-[var(--color-admin)] hover:opacity-70 transition-opacity"
                        >
                          <Play size={9} />
                          Ver demo
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                        {ex.muscle}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-foreground)] tabular-nums">
                      {ex.sets} × {ex.reps}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-muted-foreground)] hidden lg:table-cell tabular-nums">
                      {ex.rest_seconds}s
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(ex)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(ex)}
                          disabled={isPending && deletingId === ex.id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Eliminar"
                        >
                          {isPending && deletingId === ex.id
                            ? <span className="text-[10px]">…</span>
                            : <Trash2 size={13} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <ExerciseForm
          routineId={routineId}
          exercise={editingExercise}
          nextSortOrder={nextSortOrder}
          availableVideos={availableVideos}
          onClose={closeForm}
        />
      )}

      {playingVideo && (
        <VideoPlayerModal
          title={`Demo: ${playingVideo.title}`}
          storagePath={playingVideo.path}
          bucket={playingVideo.bucket}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </>
  )
}
