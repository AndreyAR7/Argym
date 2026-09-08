'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, ToggleLeft, ToggleRight, Users, MapPin } from 'lucide-react'
import { toggleClassTemplateActiveAction, deleteClassTemplateAction } from '@/lib/admin/class-template-actions'
import { ClassTemplateFormModal } from './class-template-form-modal'

interface ClassTemplate {
  id: string
  name: string
  branch_id: string
  coach_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  max_participants: number
  is_active: boolean
}

interface Branch { id: string; name: string }
interface Coach { id: string; full_name: string }

interface ClassTemplateCardProps {
  template: ClassTemplate
  branches: Branch[]
  coaches: Coach[]
  defaultCapacity: number
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function ClassTemplateCard({ template, branches, coaches, defaultCapacity }: ClassTemplateCardProps) {
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const branchName = branches.find((b) => b.id === template.branch_id)?.name ?? '—'
  const coachName = template.coach_id ? (coaches.find((c) => c.id === template.coach_id)?.full_name ?? '—') : 'Sin asignar'

  function handleToggle() {
    startTransition(async () => {
      await toggleClassTemplateActiveAction(template.id, !template.is_active)
    })
  }

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteClassTemplateAction(template.id)
      if (result?.error) setDeleteError(result.error)
      else setConfirmDelete(false)
    })
  }

  return (
    <>
      <div
        className={`relative flex flex-col rounded-2xl border bg-[var(--color-card)] overflow-hidden transition-all ${
          template.is_active
            ? 'border-[var(--color-border)] shadow-sm hover:shadow-md'
            : 'border-[var(--color-border)] opacity-60'
        }`}
      >
        {template.is_active && <div className="h-0.5 bg-[var(--color-admin)] w-full" />}

        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--color-foreground)] truncate">{template.name}</h3>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{coachName}</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md bg-[var(--color-admin-light)] text-[var(--color-admin)] flex-shrink-0">
              {DAYS[template.day_of_week]}
            </span>
          </div>

          <div className="mb-5">
            <div className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">
              {template.start_time.slice(0, 5)} – {template.end_time.slice(0, 5)}
            </div>
          </div>

          <div className="flex-1 space-y-2 mb-5 text-sm text-[var(--color-foreground)]">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[var(--color-muted-foreground)]" />
              {branchName}
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[var(--color-muted-foreground)]" />
              Cupo máximo: {template.max_participants}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] mt-auto">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {template.is_active ? 'Activa' : 'Inactiva'}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEdit(true)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                title="Editar clase"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Eliminar clase"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={handleToggle}
                disabled={isPending}
                className="w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-50"
                style={{ color: template.is_active ? 'var(--color-admin)' : 'var(--color-muted-foreground)' }}
                title={template.is_active ? 'Desactivar clase' : 'Activar clase'}
              >
                {template.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <ClassTemplateFormModal
          template={template}
          branches={branches}
          coaches={coaches}
          defaultCapacity={defaultCapacity}
          onClose={() => setShowEdit(false)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={16} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-foreground)]">Eliminar clase</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  Las instancias ya generadas no se eliminan, pero no se generarán más.
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-foreground)]">
              ¿Estás seguro de que deseas eliminar <span className="font-semibold">{template.name}</span>?
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
