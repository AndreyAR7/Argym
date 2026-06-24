import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Rutina' }

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export default async function ClientRoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: routine } = await supabase
    .from('routines')
    .select('id, name, description, level, exercises(id, name, muscle, sets, reps, rest_seconds, notes, sort_order)')
    .eq('id', id)
    .single()

  if (!routine) redirect('/client/routine')

  const exercises = ((routine as any).exercises ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link
        href="/client/routine"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Mis rutinas
      </Link>

      <PageHeader
        title={routine.name}
        subtitle={`${LEVEL_LABELS[routine.level] ?? routine.level} · ${exercises.length} ejercicio${exercises.length !== 1 ? 's' : ''}`}
      />

      {routine.description && (
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)] max-w-prose">{routine.description}</p>
      )}

      <div className="mt-6 space-y-3">
        {exercises.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Esta rutina aún no tiene ejercicios.</p>
        ) : (
          exercises.map((ex: any, idx: number) => (
            <div key={ex.id} className="flex items-start gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
              <div className="w-8 h-8 rounded-full bg-[var(--color-client-light)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[var(--color-client)]">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--color-foreground)]">{ex.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-xs text-[var(--color-muted-foreground)] font-medium">{ex.muscle}</span>
                  <span className="text-xs text-[var(--color-foreground)] font-semibold">{ex.sets} × {ex.reps} reps</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">{ex.rest_seconds}s descanso</span>
                </div>
                {ex.notes && <p className="text-xs text-[var(--color-muted-foreground)] mt-1 italic">{ex.notes}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
