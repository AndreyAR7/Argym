import { Ruler, Weight, Percent, Activity } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Measurement {
  measured_at: string
  weight_kg: number | null
  height_cm: number | null
  body_fat_pct: number | null
  waist_cm: number | null
  abdomen_cm: number | null
  hip_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
  calf_cm: number | null
  chest_cm: number | null
  shoulder_cm: number | null
  neck_cm: number | null
}

function calcBMI(weight: number | null, height: number | null): number | null {
  if (!weight || !height) return null
  return weight / ((height / 100) ** 2)
}

function fmtNum(v: number | null, decimals = 1): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

function Delta({ a, b, unit = '' }: { a: number | null; b: number | null; unit?: string }) {
  if (a == null || b == null) return <span className="text-[var(--color-muted-foreground)]">—</span>
  const d = a - b
  if (Math.abs(d) < 0.05) return <span className="text-[var(--color-muted-foreground)]">sin cambio</span>
  const positive = d > 0
  const colorClass = unit === 'kg' || unit === 'cm' || unit === '%'
    ? positive ? 'text-red-500' : 'text-emerald-500'
    : positive ? 'text-emerald-500' : 'text-red-500'
  return (
    <span className={`font-medium ${colorClass}`}>
      {positive ? '+' : ''}{d.toFixed(1)}{unit}
    </span>
  )
}

export function MeasurementsSummary({ measurements }: { measurements: Measurement[] }) {
  if (measurements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
        <Activity size={28} className="text-[var(--color-border)] mx-auto mb-3" />
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Este cliente aún no tiene medidas registradas.
        </p>
      </div>
    )
  }

  const latest = measurements[0]
  const first = measurements[measurements.length - 1]
  const hasHistory = measurements.length >= 2
  const bmi = calcBMI(latest.weight_kg, latest.height_cm)
  const firstBmi = calcBMI(first.weight_kg, first.height_cm)

  const statCards = [
    {
      label: 'Peso',
      value: fmtNum(latest.weight_kg),
      unit: 'kg',
      icon: Weight,
    },
    {
      label: 'IMC',
      value: fmtNum(bmi),
      unit: '',
      icon: Activity,
    },
    {
      label: 'Grasa corporal',
      value: fmtNum(latest.body_fat_pct),
      unit: '%',
      icon: Percent,
    },
    {
      label: 'Cintura',
      value: fmtNum(latest.waist_cm),
      unit: 'cm',
      icon: Ruler,
    },
  ]

  const circumferences = [
    { label: 'Cuello',    value: latest.neck_cm },
    { label: 'Hombros',   value: latest.shoulder_cm },
    { label: 'Pecho',     value: latest.chest_cm },
    { label: 'Abdomen',   value: latest.abdomen_cm },
    { label: 'Caderas',   value: latest.hip_cm },
    { label: 'Brazo',     value: latest.arm_cm },
    { label: 'Muslo',     value: latest.thigh_cm },
    { label: 'Pantorrilla', value: latest.calf_cm },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
          Medidas corporales
        </h3>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Última: {formatDate(latest.measured_at)} · {measurements.length} registro{measurements.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(({ label, value, unit, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className="text-[var(--color-muted-foreground)]" />
              <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-foreground)] tabular-nums">
              {value}
              {value !== '—' && unit && (
                <span className="text-sm font-normal text-[var(--color-muted-foreground)] ml-0.5">{unit}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Circumferences */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
          <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
            Circunferencias (cm)
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-[var(--color-border)]">
          {circumferences.map(({ label, value }) => (
            <div key={label} className="px-4 py-3">
              <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
              <p className="text-base font-semibold text-[var(--color-foreground)] tabular-nums">
                {fmtNum(value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Progress comparison */}
      {hasHistory && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
              Progreso — primera vs última medición
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                  <th className="px-4 py-2.5 text-left text-xs text-[var(--color-muted-foreground)]">Métrica</th>
                  <th className="px-4 py-2.5 text-right text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    {formatDate(first.measured_at)}
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    {formatDate(latest.measured_at)}
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs text-[var(--color-muted-foreground)]">Cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {[
                  { label: 'Peso (kg)',       a: latest.weight_kg,   b: first.weight_kg,   unit: 'kg' },
                  { label: 'IMC',             a: bmi,                b: firstBmi,           unit: '' },
                  { label: 'Grasa corporal (%)', a: latest.body_fat_pct, b: first.body_fat_pct, unit: '%' },
                  { label: 'Cintura (cm)',    a: latest.waist_cm,    b: first.waist_cm,    unit: 'cm' },
                  { label: 'Cadera (cm)',     a: latest.hip_cm,      b: first.hip_cm,      unit: 'cm' },
                  { label: 'Brazo (cm)',      a: latest.arm_cm,      b: first.arm_cm,      unit: 'cm' },
                ]
                  .filter(r => r.a != null || r.b != null)
                  .map(({ label, a, b, unit }) => (
                    <tr key={label} className="hover:bg-[var(--color-muted)] transition-colors">
                      <td className="px-4 py-2.5 text-[var(--color-foreground)]">{label}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--color-muted-foreground)] tabular-nums">
                        {fmtNum(b)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-[var(--color-foreground)] tabular-nums">
                        {fmtNum(a)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <Delta a={a} b={b} unit={unit} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History */}
      {measurements.length > 1 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
              Historial ({measurements.length} registros)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                  <th className="px-4 py-2.5 text-left text-xs text-[var(--color-muted-foreground)]">Fecha</th>
                  <th className="px-4 py-2.5 text-right text-xs text-[var(--color-muted-foreground)]">Peso</th>
                  <th className="px-4 py-2.5 text-right text-xs text-[var(--color-muted-foreground)]">IMC</th>
                  <th className="px-4 py-2.5 text-right text-xs text-[var(--color-muted-foreground)] hidden md:table-cell">Grasa %</th>
                  <th className="px-4 py-2.5 text-right text-xs text-[var(--color-muted-foreground)] hidden md:table-cell">Cintura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {measurements.map((m) => (
                  <tr key={m.measured_at} className="hover:bg-[var(--color-muted)] transition-colors">
                    <td className="px-4 py-2.5 text-[var(--color-foreground)]">{formatDate(m.measured_at)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-foreground)]">
                      {fmtNum(m.weight_kg)} kg
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {fmtNum(calcBMI(m.weight_kg, m.height_cm))}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-muted-foreground)] hidden md:table-cell">
                      {fmtNum(m.body_fat_pct)}%
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-muted-foreground)] hidden md:table-cell">
                      {fmtNum(m.waist_cm)} cm
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
