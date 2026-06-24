import { cn } from '@/lib/utils'

type Variant =
  | 'approved' | 'pending' | 'rejected'
  | 'active' | 'inactive' | 'cancelled' | 'expired'
  | 'paid' | 'overdue'
  | 'beginner' | 'intermediate' | 'advanced'
  | 'scheduled' | 'confirmed' | 'completed' | 'no_show'
  | 'published' | 'draft' | 'archived'
  | 'default'

const styles: Record<Variant, string> = {
  // Approval / lifecycle
  approved:     'bg-emerald-50  text-emerald-700  border-emerald-200',
  pending:      'bg-amber-50    text-amber-700    border-amber-200',
  rejected:     'bg-red-50      text-red-700      border-red-200',
  // Subscription / invoices
  active:       'bg-emerald-50  text-emerald-700  border-emerald-200',
  inactive:     'bg-zinc-100    text-zinc-500     border-zinc-200',
  cancelled:    'bg-red-50      text-red-600      border-red-200',
  expired:      'bg-zinc-100    text-zinc-500     border-zinc-200',
  paid:         'bg-emerald-50  text-emerald-700  border-emerald-200',
  overdue:      'bg-red-50      text-red-700      border-red-200',
  // Client level
  beginner:     'bg-sky-50      text-sky-700      border-sky-200',
  intermediate: 'bg-amber-50    text-amber-700    border-amber-200',
  advanced:     'bg-violet-50   text-violet-700   border-violet-200',
  // Appointment
  scheduled:    'bg-blue-50     text-blue-700     border-blue-200',
  confirmed:    'bg-emerald-50  text-emerald-700  border-emerald-200',
  completed:    'bg-purple-50   text-purple-700   border-purple-200',
  no_show:      'bg-orange-50   text-orange-700   border-orange-200',
  // Content
  published:    'bg-emerald-50  text-emerald-700  border-emerald-200',
  draft:        'bg-zinc-100    text-zinc-500     border-zinc-200',
  archived:     'bg-zinc-100    text-zinc-500     border-zinc-200',
  // Fallback
  default:      'bg-zinc-100    text-zinc-600     border-zinc-200',
}

const labels: Partial<Record<string, string>> = {
  approved:     'Aprobado',
  pending:      'Pendiente',
  rejected:     'Rechazado',
  active:       'Activo',
  inactive:     'Inactivo',
  cancelled:    'Cancelado',
  expired:      'Vencido',
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
  scheduled:    'Programada',
  confirmed:    'Confirmada',
  completed:    'Completada',
  no_show:      'No asistió',
  published:    'Publicado',
  draft:        'Borrador',
  archived:     'Archivado',
  paid:         'Pagado',
  overdue:      'Vencida',
}

interface BadgeProps {
  value: string
  className?: string
  showDot?: boolean
}

export function Badge({ value, className, showDot }: BadgeProps) {
  const variant = (styles[value as Variant] ? value : 'default') as Variant
  const label = labels[value] ?? value

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        styles[variant],
        className,
      )}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
      )}
      {label}
    </span>
  )
}
