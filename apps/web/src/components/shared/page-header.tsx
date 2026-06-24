interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[var(--color-foreground)] truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {children}
        </div>
      )}
    </div>
  )
}
