import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Dumbbell, Calendar } from 'lucide-react'
import { getSessionData } from '@/lib/auth/session'
import { Badge } from '@/components/ui/badge'
import { RoutineDetailClient } from '@/components/admin/routine-detail-client'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Detalle de rutina' }

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
}

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: routineId } = await params

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  const [routineResult, exercisesResult] = await Promise.all([
    supabase
      .from('routines')
      .select('id, name, description, level, allowed_plans, allowed_levels, is_active, is_template, created_at')
      .eq('id', routineId)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('exercises')
      .select('id, name, muscle, sets, reps, rest_seconds, notes, sort_order')
      .eq('routine_id', routineId)
      .order('sort_order', { ascending: true }),
  ])

  const routine = routineResult.data
  if (!routine) redirect('/admin/routines')

  const exercises = exercisesResult.data ?? []

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/admin/routines"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Volver a rutinas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center flex-shrink-0">
            <Dumbbell size={20} className="text-[var(--color-admin)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-foreground)] tracking-tight">
              {routine.name}
            </h1>
            {routine.description && (
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)] max-w-prose">
                {routine.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge value={routine.level} />
              {routine.is_active ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Activa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]">
                  Inactiva
                </span>
              )}
              {routine.is_template && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-admin-light)] text-[var(--color-admin)] border border-[var(--color-admin)]/20">
                  Plantilla
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Nivel</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
            {LEVEL_LABELS[routine.level] ?? routine.level}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Ejercicios</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
            {exercises.length}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Tipo</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
            {routine.is_template ? 'Plantilla' : 'Personalizada'}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Creada</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">
            {formatDate(routine.created_at)}
          </p>
        </div>
      </div>

      {/* Allowed plans / levels */}
      {((routine.allowed_plans as string[])?.length > 0 || (routine.allowed_levels as string[])?.length > 0) && (
        <div className="flex flex-wrap gap-4 mb-6 text-xs text-[var(--color-muted-foreground)]">
          {(routine.allowed_plans as string[])?.length > 0 && (
            <span>
              Planes: {(routine.allowed_plans as string[]).join(', ')}
            </span>
          )}
          {(routine.allowed_levels as string[])?.length > 0 && (
            <span>
              Niveles: {(routine.allowed_levels as string[]).map((l) => LEVEL_LABELS[l] ?? l).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Exercise CRUD — client component */}
      <RoutineDetailClient routineId={routineId} exercises={exercises} />
    </div>
  )
}
