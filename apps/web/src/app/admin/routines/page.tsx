import { getSessionData } from '@/lib/auth/session'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { RoutineToggle } from '@/components/admin/routine-toggle'
import { RoutineSearch } from '@/components/admin/routine-search'
import { NewRoutineButton } from '@/components/admin/new-routine-button'
import { RoutineDeleteButton } from '@/components/admin/routine-delete-button'
import { Dumbbell } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Rutinas' }

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; level?: string }>
}) {
  const params = await searchParams
  const search = params.search ?? ''
  const levelFilter = params.level ?? 'all'

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  let query = supabase
    .from('routines')
    .select('id, name, description, level, is_active, is_template, created_at, exercises(count)', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (search) query = query.ilike('name', `%${search}%`)
  if (levelFilter !== 'all') query = query.eq('level', levelFilter)

  const { data: routines, count } = await query

  function buildUrl(s?: string, l?: string) {
    const sp = new URLSearchParams()
    if (s ?? search) sp.set('search', s ?? search)
    const lv = l ?? levelFilter
    if (lv !== 'all') sp.set('level', lv)
    const qs = sp.toString()
    return `/admin/routines${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Rutinas"
        subtitle={`${count ?? 0} rutina${count !== 1 ? 's' : ''} creadas`}
      >
        <NewRoutineButton />
      </PageHeader>

      {/* ── Filters ── */}
      <div className="mt-6 flex flex-wrap gap-3">
        <RoutineSearch defaultValue={search} />
        <div className="flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 overflow-x-auto">
          {[
            { value: 'all',          label: 'Todos' },
            { value: 'beginner',     label: 'Principiante' },
            { value: 'intermediate', label: 'Intermedio' },
            { value: 'advanced',     label: 'Avanzado' },
          ].map((opt) => (
            <Link
              key={opt.value}
              href={buildUrl(search, opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                levelFilter === opt.value
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {!routines || routines.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center">
            <Dumbbell size={24} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">No hay rutinas</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Crea rutinas desde la aplicación móvil.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Rutina</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Nivel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Ejercicios</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Activa</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
              {routines.map((routine) => (
                <tr key={routine.id} className="hover:bg-[var(--color-muted)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-foreground)]">{routine.name}</p>
                    {routine.description && (
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-1">
                        {routine.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge value={routine.level} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-muted-foreground)] hidden md:table-cell">
                    {(routine as any).exercises?.[0]?.count ?? 0} ejercicio{((routine as any).exercises?.[0]?.count ?? 0) !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {routine.is_template ? (
                      <span className="text-xs font-medium text-[var(--color-admin)] bg-[var(--color-admin-light)] px-2 py-0.5 rounded-md">
                        Plantilla
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-muted-foreground)]">Personalizada</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <RoutineDeleteButton routineId={routine.id} routineName={routine.name} />
                      <Link
                        href={`/admin/routines/${routine.id}`}
                        className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                      >
                        Ver
                      </Link>
                      <RoutineToggle routineId={routine.id} isActive={routine.is_active} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
