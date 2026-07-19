export default function CheckinLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="animate-pulse text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-[var(--color-muted)] mx-auto" />
        <div className="h-4 w-40 bg-[var(--color-muted)] rounded mx-auto" />
      </div>
    </div>
  )
}
