'use client'

import { useState, useTransition } from 'react'
import { Play, CheckCircle2 } from 'lucide-react'
import { toggleExerciseProgressAction } from '@/lib/client/actions'
import { VideoPlayerModal } from '@/components/admin/video-player-modal'

interface Exercise {
  id: string
  name: string
  muscle: string
  sets: number
  reps: string
  rest_seconds: number
  notes: string | null
  demo_video_storage_path: string | null
  demo_video_bucket: string | null
}

interface Props {
  routineId: string
  exercises: Exercise[]
  initialProgress: Record<string, boolean>
}

export function RoutineExerciseList({ routineId, exercises, initialProgress }: Props) {
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(initialProgress)
  const [demoVideo, setDemoVideo] = useState<{ path: string; bucket: string; title: string } | null>(null)
  const [, startTransition] = useTransition()

  const completedCount = exercises.filter((e) => completedMap[e.id]).length
  const pct = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0
  const allDone = completedCount === exercises.length && exercises.length > 0

  function handleToggle(exerciseId: string) {
    const newVal = !completedMap[exerciseId]
    setCompletedMap((prev) => ({ ...prev, [exerciseId]: newVal }))
    startTransition(async () => {
      await toggleExerciseProgressAction(routineId, exerciseId, newVal)
    })
  }

  return (
    <>
      {/* Progress summary */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-[var(--color-muted-foreground)] font-medium uppercase tracking-wider">Progreso de hoy</p>
            <p className="text-2xl font-bold text-[var(--color-foreground)] mt-0.5">
              {completedCount}<span className="text-sm font-normal text-[var(--color-muted-foreground)]">/{exercises.length} ejercicios</span>
            </p>
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center border-4 flex-shrink-0"
            style={{
              borderColor: allDone ? 'var(--color-client)' : 'var(--color-border)',
              color: allDone ? 'var(--color-client)' : 'var(--color-foreground)',
            }}
          >
            <span className="text-sm font-bold">{pct}%</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-muted)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: allDone ? 'var(--color-client)' : 'var(--color-client)',
              opacity: allDone ? 1 : 0.6,
            }}
          />
        </div>
        {allDone && (
          <p className="mt-3 text-sm font-semibold text-[var(--color-client)] flex items-center gap-1.5">
            <CheckCircle2 size={15} />
            ¡Excelente! Rutina completada al 100%
          </p>
        )}
      </div>

      {/* Exercise list */}
      <div className="space-y-2.5">
        {exercises.map((ex, idx) => {
          const done = !!completedMap[ex.id]
          return (
            <div
              key={ex.id}
              onClick={() => handleToggle(ex.id)}
              className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all select-none"
              style={{
                backgroundColor: done ? 'color-mix(in srgb, var(--color-client) 8%, transparent)' : 'var(--color-card)',
                borderColor: done ? 'color-mix(in srgb, var(--color-client) 30%, transparent)' : 'var(--color-border)',
              }}
            >
              {/* Number / Checkbox */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all mt-0.5 text-xs font-bold border-2"
                style={{
                  backgroundColor: done ? 'var(--color-client)' : 'transparent',
                  borderColor: done ? 'var(--color-client)' : 'var(--color-border)',
                  color: done ? '#fff' : 'var(--color-muted-foreground)',
                }}
              >
                {done ? '✓' : idx + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm transition-colors ${done ? 'line-through text-[var(--color-muted-foreground)]' : 'text-[var(--color-foreground)]'}`}>
                  {ex.name}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  <span className="text-xs font-semibold text-[var(--color-foreground)]">{ex.sets} × {ex.reps} reps</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">{ex.rest_seconds}s descanso</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-client) 15%, transparent)', color: 'var(--color-client)' }}>
                    {ex.muscle}
                  </span>
                </div>
                {ex.notes && (
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1 italic">💡 {ex.notes}</p>
                )}
              </div>

              {/* Demo button */}
              {ex.demo_video_storage_path && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDemoVideo({
                      path: ex.demo_video_storage_path!,
                      bucket: ex.demo_video_bucket ?? 'exercise-demos',
                      title: ex.name,
                    })
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: 'var(--color-client)' }}
                >
                  <Play size={9} />
                  Demo
                </button>
              )}
            </div>
          )
        })}
      </div>

      {demoVideo && (
        <VideoPlayerModal
          title={demoVideo.title}
          storagePath={demoVideo.path}
          bucket={demoVideo.bucket}
          onClose={() => setDemoVideo(null)}
        />
      )}
    </>
  )
}
