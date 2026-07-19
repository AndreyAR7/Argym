export default function SuperAdminLoading() {
  return (
    <div className="p-6 md:p-8 animate-pulse">
      <div className="mb-6">
        <div className="h-5 w-40 rounded-lg" style={{ background: '#1a1a1a' }} />
        <div className="h-3.5 w-28 rounded mt-2" style={{ background: '#1a1a1a' }} />
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#1f1f1f' }}>
        <div className="h-11" style={{ background: '#111111', borderBottom: '1px solid #1f1f1f' }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5"
            style={{ background: '#0d0d0d', borderBottom: '1px solid #1a1a1a' }}
          >
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 rounded" style={{ background: '#1a1a1a' }} />
              <div className="h-3 w-24 rounded" style={{ background: '#1a1a1a' }} />
            </div>
            <div className="h-5 w-16 rounded-full hidden md:block" style={{ background: '#1a1a1a' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
