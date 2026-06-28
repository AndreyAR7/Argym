'use client'

export type MeasureZone =
  | 'neck' | 'shoulder' | 'chest' | 'waist' | 'abdomen' | 'hip'
  | 'arm' | 'thigh' | 'calf' | 'weight' | 'height'

export type Gender = 'male' | 'female' | 'other'

interface EllipseSpec { cx: number; cy: number; rx: number; ry: number }

// Zone ellipse positions in viewBox 0 0 160 430
const ZONES: Record<MeasureZone, EllipseSpec | [EllipseSpec, EllipseSpec]> = {
  weight:   { cx: 80, cy: 200, rx: 28, ry: 13 },
  height:   { cx: 80, cy: 215, rx: 60, ry: 200 }, // not rendered
  neck:     { cx: 80, cy: 68,  rx: 14, ry: 9  },
  shoulder: { cx: 80, cy: 93,  rx: 40, ry: 12 },
  chest:    { cx: 80, cy: 138, rx: 34, ry: 16 },
  waist:    { cx: 80, cy: 188, rx: 22, ry: 11 },
  abdomen:  { cx: 80, cy: 212, rx: 26, ry: 12 },
  hip:      { cx: 80, cy: 248, rx: 40, ry: 20 },
  arm:      [{ cx: 22, cy: 135, rx: 11, ry: 28 }, { cx: 138, cy: 135, rx: 11, ry: 28 }],
  thigh:    [{ cx: 57, cy: 300, rx: 20, ry: 30 }, { cx: 103, cy: 300, rx: 20, ry: 30 }],
  calf:     [{ cx: 60, cy: 368, rx: 14, ry: 24 }, { cx: 100, cy: 368, rx: 14, ry: 24 }],
}

const HIP_FEMALE: EllipseSpec = { cx: 80, cy: 256, rx: 50, ry: 22 }

const BODY_FILL = '#1A1B38'
const ACTIVE_COLOR = '#00C8FF'
const COMPLETED_COLOR = '#FF6B2B'

interface Props {
  gender: Gender | null
  activeZone: MeasureZone | null
  completedZones: MeasureZone[]
  className?: string
}

export function BodySilhouette({ gender, activeZone, completedZones, className }: Props) {
  const isFemale = gender === 'female'
  const completedSet = new Set(completedZones)

  function renderZoneEllipses(zone: MeasureZone, specs: EllipseSpec | [EllipseSpec, EllipseSpec], isActive: boolean, isCompleted: boolean) {
    if (zone === 'height') return null
    const color = isActive ? ACTIVE_COLOR : isCompleted ? COMPLETED_COLOR : null
    if (!color) return null
    const arr = Array.isArray(specs) ? specs : [specs]
    return arr.map((s, i) => (
      <ellipse
        key={`${zone}-${i}`}
        cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
        fill={color}
        fillOpacity={isActive ? 0.75 : 0.55}
        className={isActive ? 'silhouette-pulse' : undefined}
      />
    ))
  }

  return (
    <svg viewBox="0 0 160 430" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <style>{`
          @keyframes silhouette-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          .silhouette-pulse { animation: silhouette-pulse 1.2s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* ── Body shapes ── */}
      <g fill={BODY_FILL}>
        {/* Head */}
        <ellipse cx="80" cy="34" rx="22" ry="25" />

        {/* Neck */}
        <path d="M 69 58 Q 80 54 91 58 L 93 77 Q 80 80 67 77 Z" />

        {isFemale ? (
          <>
            {/* Female: narrower shoulders */}
            <rect x="10" y="79" width="22" height="118" rx="11" />
            <rect x="128" y="79" width="22" height="118" rx="11" />
            <path d="M 30 80 L 130 80 L 112 178 L 48 178 Z" />
            {/* Bust */}
            <ellipse cx="60" cy="128" rx="18" ry="14" />
            <ellipse cx="100" cy="128" rx="18" ry="14" />
            {/* Lower torso — wider hips */}
            <path d="M 48 178 L 112 178 L 132 262 L 28 262 Z" />
            {/* Crotch gap */}
            <path d="M 68 260 L 92 260 L 86 196 L 74 196 Z" />
            {/* Legs */}
            <rect x="28" y="258" width="38" height="170" rx="14" />
            <rect x="94" y="258" width="38" height="170" rx="14" />
          </>
        ) : (
          <>
            {/* Male: wider shoulders, V-taper */}
            <rect x="4" y="79" width="20" height="118" rx="10" />
            <rect x="136" y="79" width="20" height="118" rx="10" />
            <path d="M 22 80 L 138 80 L 118 178 L 42 178 Z" />
            {/* Lower torso */}
            <path d="M 42 178 L 118 178 L 122 258 L 38 258 Z" />
            {/* Crotch gap */}
            <path d="M 68 256 L 92 256 L 86 196 L 74 196 Z" />
            {/* Legs */}
            <rect x="38" y="254" width="34" height="174" rx="14" />
            <rect x="88" y="254" width="34" height="174" rx="14" />
          </>
        )}
      </g>

      {/* ── Zone highlights ── */}
      {(Object.entries(ZONES) as [MeasureZone, EllipseSpec | [EllipseSpec, EllipseSpec]][]).map(
        ([zone, specs]) => {
          const isActive = zone === activeZone
          const isCompleted = completedSet.has(zone)
          if (!isActive && !isCompleted) return null
          const resolvedSpecs = zone === 'hip' && isFemale ? HIP_FEMALE : specs
          return renderZoneEllipses(zone, resolvedSpecs, isActive, isCompleted)
        }
      )}
    </svg>
  )
}
