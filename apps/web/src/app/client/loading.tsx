export default function ClientLoading() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-6 w-48 bg-[var(--color-muted)] rounded-lg" />
        <div className="h-4 w-32 bg-[var(--color-muted)] rounded mt-2" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <div className="h-3 w-20 bg-[var(--color-muted)] rounded mb-3" />
            <div className="h-7 w-14 bg-[var(--color-muted)] rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <div className="aspect-video bg-[var(--color-muted)]" />
            <div className="p-3 space-y-1.5">
              <div className="h-3.5 w-3/4 bg-[var(--color-muted)] rounded" />
              <div className="h-3 w-1/2 bg-[var(--color-muted)] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
