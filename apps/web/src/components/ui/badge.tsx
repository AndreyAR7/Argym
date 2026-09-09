import { cn } from '@/lib/utils'
import { styles, labels, type Variant } from './badge-variants'

export { styles, labels }

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
