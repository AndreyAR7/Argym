const EKG_PATH = 'M0,50 L140,50 L155,50 L165,30 L175,70 L185,10 L195,85 L205,50 L220,50 L400,50'

function EkgTile() {
  return (
    <svg className="h-full" style={{ width: '50%' }} viewBox="0 0 400 100" preserveAspectRatio="none">
      <path
        d={EKG_PATH}
        fill="none"
        stroke="var(--color-admin)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 6px var(--color-admin))' }}
      />
    </svg>
  )
}

// Decorative gym+tech background: a scrolling heart-rate monitor line and a
// spinning activity-ring HUD, evoking fitness tracking rendered as a tech dashboard.
export function FitnessHud({ ringSize = 200 }: { ringSize?: number }) {
  return (
    <>
      <div className="absolute inset-x-0 top-[16%] h-[90px] overflow-hidden pointer-events-none opacity-[0.35]">
        <div className="argym-ekg-scroll flex h-full" style={{ width: '200%' }}>
          <EkgTile />
          <EkgTile />
        </div>
      </div>

      <div
        className="argym-ring-spin absolute -top-10 -right-10 opacity-[0.5] pointer-events-none"
        style={{ width: ringSize, height: ringSize }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-admin)" strokeWidth="5" strokeLinecap="round" strokeDasharray="180 264" opacity="0.55" />
          <circle cx="50" cy="50" r="32" fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" strokeDasharray="140 201" opacity="0.45" />
          <circle cx="50" cy="50" r="22" fill="none" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" strokeDasharray="90 138" opacity="0.4" />
        </svg>
      </div>
    </>
  )
}
