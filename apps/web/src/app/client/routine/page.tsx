import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Dumbbell, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Mis Rutinas' }

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

export default async function ClientRoutinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assignments } = await supabase
    .from('routine_assignments')
    .select(`
      id,
      assigned_at,
      routines (
        id, name, description, level, is_active,
        exercises (id)
      )
    `)
    .eq('client_id', user.id)
    .order('assigned_at', { ascending: false })

  const routines = (assignments ?? [])
    .map((a: any) => ({ ...a.routines, assignedAt: a.assigned_at }))
    .filter(Boolean)

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Mis Rutinas"
        subtitle={`${routines.length} rutina${routines.length !== 1 ? 's' : ''} asignada${routines.length !== 1 ? 's' : ''}`}
      />

      <div className="mt-6 space-y-3">
        {routines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
              <Dumbbell size={20} className="text-[var(--color-border)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Sin rutinas asignadas</p>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
              Tu coach te asignará rutinas de entrenamiento pronto.
            </p>
          </div>
        ) : (
          routines.map((routine: any) => {
            const exerciseCount = routine.exercises?.length ?? 0
            const levelColor = LEVEL_COLORS[routine.level] ?? 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border-[var(--color-border)]'
            return (
              <Link
                key={routine.id}
                href={`/client/routine/${routine.id}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-client)]/40 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--color-client-light)] flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={18} className="text-[var(--color-client)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-foreground)] truncate">{routine.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${levelColor}`}>
                      {LEVEL_LABELS[routine.level] ?? routine.level}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {exerciseCount} ejercicio{exerciseCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--color-muted-foreground)] group-hover:text-[var(--color-client)] transition-colors flex-shrink-0" />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
