export default function CoachLoading() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-6 w-48 bg-[var(--color-muted)] rounded-lg" />
        <div className="h-4 w-32 bg-[var(--color-muted)] rounded mt-2" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <div className="h-3 w-20 bg-[var(--color-muted)] rounded mb-3" />
            <div className="h-7 w-14 bg-[var(--color-muted)] rounded" />
          </div>
        ))}
      </div>

      {/* List skeleton */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="h-11 bg-[var(--color-muted)] border-b border-[var(--color-border)]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="w-8 h-8 rounded-full bg-[var(--color-muted)]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 bg-[var(--color-muted)] rounded" />
              <div className="h-3 w-24 bg-[var(--color-muted)] rounded" />
            </div>
            <div className="h-7 w-20 bg-[var(--color-muted)] rounded-lg hidden lg:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
