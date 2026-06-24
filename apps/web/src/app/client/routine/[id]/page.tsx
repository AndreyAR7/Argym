import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { RoutineExerciseList } from '@/components/client/routine-exercise-list'

export const metadata = { title: 'Rutina' }

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced: 'bg-red-50 text-red-700 border-red-200',
}

export default async function ClientRoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: routine }, { data: progressRows }] = await Promise.all([
    supabase
      .from('routines')
      .select('id, name, description, level, exercises(id, name, muscle, sets, reps, rest_seconds, notes, sort_order, demo_video_storage_path, demo_video_bucket)')
      .eq('id', id)
      .single(),
    supabase
      .from('exercise_progress')
      .select('exercise_id, completed')
      .eq('client_id', user.id)
      .eq('session_date', new Date().toISOString().split('T')[0]),
  ])

  if (!routine) redirect('/client/routine')

  const exercises = ((routine as any).exercises ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)

  const initialProgress: Record<string, boolean> = {}
  for (const p of progressRows ?? []) {
    initialProgress[p.exercise_id] = p.completed
  }

  const levelColor = LEVEL_COLORS[routine.level] ?? 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]'

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link
        href="/client/routine"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Mis rutinas
      </Link>

      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">{routine.name}</h1>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded border flex-shrink-0 mt-1 ${levelColor}`}>
          {LEVEL_LABELS[routine.level] ?? routine.level}
        </span>
      </div>
      {routine.description && (
        <p className="text-sm text-[var(--color-muted-foreground)] mb-6">{routine.description}</p>
      )}

      {exercises.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">Esta rutina aún no tiene ejercicios.</p>
      ) : (
        <RoutineExerciseList
          routineId={routine.id}
          exercises={exercises}
          initialProgress={initialProgress}
        />
      )}
    </div>
  )
}
