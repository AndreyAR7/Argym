import { getInitials, cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { outer: 'w-7 h-7',  text: 'text-[10px]' },
  md: { outer: 'w-8 h-8',  text: 'text-xs' },
  lg: { outer: 'w-10 h-10', text: 'text-sm' },
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const { outer, text } = sizeMap[size]

  return (
    <div className={cn('rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[var(--color-admin-light)]', outer, className)}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className={cn('font-semibold text-[var(--color-admin)]', text)}>
          {getInitials(name)}
        </span>
      )}
    </div>
  )
}
