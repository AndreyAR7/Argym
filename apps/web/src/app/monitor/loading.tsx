export default function MonitorLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#080810' }}
    >
      <div className="animate-pulse text-center space-y-4">
        <div className="w-64 h-64 rounded-2xl bg-white/5 mx-auto" />
        <div className="h-4 w-32 bg-white/5 rounded mx-auto" />
      </div>
    </div>
  )
}
