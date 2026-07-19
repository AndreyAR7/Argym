export default function AuthLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-40 bg-[var(--color-muted)] rounded-lg mb-2" />
      <div className="h-4 w-56 bg-[var(--color-muted)] rounded mb-8" />

      <div className="space-y-5">
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 bg-[var(--color-muted)] rounded" />
          <div className="h-11 w-full bg-[var(--color-muted)] rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 bg-[var(--color-muted)] rounded" />
          <div className="h-11 w-full bg-[var(--color-muted)] rounded-lg" />
        </div>
        <div className="h-11 w-full bg-[var(--color-muted)] rounded-lg" />
      </div>
    </div>
  )
}
