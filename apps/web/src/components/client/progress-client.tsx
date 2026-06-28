'use client'

import { useState } from 'react'
import { TrendingUp, Scale, Flame, Plus } from 'lucide-react'
import { MeasurementWizard, WizardMeasurement } from './measurement-wizard'
import type { Gender } from './body-silhouette'

// ─── Types ────────────────────────────────────────────────────

interface BodyMeasurement {
  id: string
  measured_at: string
  weight_kg: number | null
  height_cm: number | null
  body_fat_pct: number | null
  neck_cm: number | null
  shoulder_cm: number | null
  chest_cm: number | null
  waist_cm: number | null
  abdomen_cm: number | null
  hip_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
  calf_cm: number | null
  notes: string | null
}

interface DailyProgress {
  date: string
  pct: number
}

interface StreakData {
  currentStreak: number
  longestStreak: number
  activeDates: string[]
}

interface Props {
  measurements: BodyMeasurement[]
  dailyProgress: DailyProgress[]
  streak: StreakData
  thisWeekMeasurement: BodyMeasurement | null
  gender: string | null
}

// ─── BMI helpers ──────────────────────────────────────────────

function calcBMI(w: number, h: number) {
  return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10
}

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Bajo peso',   color: '#3b82f6' }
  if (bmi < 25)   return { label: 'Normal',       color: '#22c55e' }
  if (bmi < 30)   return { label: 'Sobrepeso',    color: '#f59e0b' }
  if (bmi < 35)   return { label: 'Obesidad I',   color: '#ef4444' }
  return                  { label: 'Obesidad II',  color: '#b91c1c' }
}

// ─── Bar Chart ────────────────────────────────────────────────

const DAY_ABBR = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function BarChart({ data }: { data: { label: string; pct: number }[] }) {
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => {
        const h = Math.max(4, (d.pct / 100) * 72)
        const color = d.pct === 100 ? '#22c55e' : d.pct > 0 ? 'var(--color-client)' : 'var(--color-border)'
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            {d.pct > 0 && <span className="text-[9px] text-[var(--color-muted-foreground)]">{d.pct}%</span>}
            <div className="flex-1 flex items-end w-full">
              <div className="w-full rounded-sm transition-all" style={{ height: h, backgroundColor: color }} />
            </div>
            <span className="text-[10px] text-[var(--color-muted-foreground)]">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Streak Calendar ──────────────────────────────────────────

function StreakCalendar({ activeDates }: { activeDates: string[] }) {
  const today = new Date()
  const dow = today.getDay()
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const startMon = new Date(today)
  startMon.setDate(today.getDate() - daysFromMon - 28)

  const activeSet = new Set(activeDates)
  const weeks: { dateStr: string; dayNum: number; active: boolean; future: boolean }[][] = []

  for (let w = 0; w < 5; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const cell = new Date(startMon)
      cell.setDate(startMon.getDate() + w * 7 + d)
      const dateStr = cell.toISOString().split('T')[0]
      week.push({
        dateStr,
        dayNum: cell.getDate(),
        active: cell <= today && activeSet.has(dateStr),
        future: cell > today,
      })
    }
    weeks.push(week)
  }

  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[var(--color-muted-foreground)]">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day) => (
            <div
              key={day.dateStr}
              className="aspect-square rounded-md flex items-center justify-center text-[9px] font-medium"
              style={{
                backgroundColor: day.future ? 'transparent' : day.active ? '#22c55e' : 'var(--color-muted)',
                color: day.active ? '#fff' : day.future ? 'transparent' : 'var(--color-muted-foreground)',
              }}
            >
              {!day.future ? day.dayNum : ''}
            </div>
          ))}
        </div>
      ))}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#22c55e]" />
          <span className="text-[10px] text-[var(--color-muted-foreground)]">Día activo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[var(--color-muted)]" />
          <span className="text-[10px] text-[var(--color-muted-foreground)]">Sin actividad</span>
        </div>
      </div>
    </div>
  )
}

// ─── Comparison Card ──────────────────────────────────────────

const COMPARISON_METRICS: { key: keyof BodyMeasurement; label: string; unit: string; lowerIsBetter: boolean | null }[] = [
  { key: 'weight_kg',    label: 'Peso',        unit: 'kg', lowerIsBetter: null },
  { key: 'body_fat_pct', label: '% Grasa',     unit: '%',  lowerIsBetter: true },
  { key: 'waist_cm',     label: 'Cintura',     unit: 'cm', lowerIsBetter: true },
  { key: 'abdomen_cm',   label: 'Abdomen',     unit: 'cm', lowerIsBetter: true },
  { key: 'hip_cm',       label: 'Cadera',      unit: 'cm', lowerIsBetter: null },
  { key: 'chest_cm',     label: 'Pecho',       unit: 'cm', lowerIsBetter: null },
  { key: 'arm_cm',       label: 'Brazo',       unit: 'cm', lowerIsBetter: false },
  { key: 'thigh_cm',     label: 'Muslo',       unit: 'cm', lowerIsBetter: null },
]

function deltaColor(delta: number, lowerIsBetter: boolean | null): string {
  if (delta === 0) return 'var(--color-muted-foreground)'
  if (lowerIsBetter === null) return 'var(--color-muted-foreground)'
  if (lowerIsBetter) return delta < 0 ? '#22c55e' : '#ef4444'
  return delta > 0 ? '#22c55e' : '#f59e0b'
}

function ComparisonCard({ measurements }: { measurements: BodyMeasurement[] }) {
  if (measurements.length < 2) return null
  const latest = measurements[0]
  const first = measurements[measurements.length - 1]

  const rows = COMPARISON_METRICS.filter(
    (m) => (latest[m.key] as number | null) != null && (first[m.key] as number | null) != null
  )
  if (rows.length === 0) return null

  const firstDate = new Date(first.measured_at + 'T12:00:00').toLocaleDateString('es-CR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">📊 Inicio vs Ahora</p>
        <span className="text-[10px] text-[var(--color-muted-foreground)]">Inicio: {firstDate}</span>
      </div>
      <div className="space-y-2">
        {rows.map((m) => {
          const v1 = first[m.key] as number
          const v2 = latest[m.key] as number
          const delta = Math.round((v2 - v1) * 10) / 10
          const sign = delta > 0 ? '+' : ''
          const color = deltaColor(delta, m.lowerIsBetter)
          return (
            <div key={m.key as string} className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-muted-foreground)] w-20">{m.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-muted-foreground)]">{v1} {m.unit}</span>
                <span className="text-[var(--color-muted-foreground)]">→</span>
                <span className="font-bold text-[var(--color-foreground)]">{v2} {m.unit}</span>
                <span className="font-bold w-14 text-right" style={{ color }}>
                  {sign}{delta} {m.unit}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab: Rutinas ─────────────────────────────────────────────

function RoutinasTab({ dailyProgress, streak }: { dailyProgress: DailyProgress[]; streak: StreakData }) {
  const last7 = dailyProgress.slice(-7)
  const barData = last7.map((d) => ({
    label: DAY_ABBR[new Date(d.date + 'T12:00:00').getDay()],
    pct: d.pct,
  }))
  const activeDays = dailyProgress.filter((d) => d.pct > 0).length
  const active = dailyProgress.filter((d) => d.pct > 0)
  const avgPct = active.length > 0 ? Math.round(active.reduce((s, d) => s + d.pct, 0) / active.length) : 0

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <p className="text-sm font-semibold text-[var(--color-foreground)] mb-1">Actividad últimos 7 días</p>
        <p className="text-xs text-[var(--color-muted-foreground)] mb-4">
          {barData.filter((d) => d.pct > 0).length} de 7 días activos
        </p>
        <BarChart data={barData} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { value: activeDays, label: 'Días activos', sub: 'últimas 2 sem.', color: '#f59e0b' },
          { value: `${avgPct}%`, label: 'Promedio', sub: 'completado', color: '#22c55e' },
          { value: `${streak.currentStreak}🔥`, label: 'Racha actual', sub: 'días seguidos', color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-center">
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{s.label}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)]">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Medidas ─────────────────────────────────────────────

const CIRCUM_FIELDS: { key: keyof BodyMeasurement; label: string; color: string }[] = [
  { key: 'neck_cm',     label: 'Cuello',     color: '#a78bfa' },
  { key: 'shoulder_cm', label: 'Hombros',    color: '#60a5fa' },
  { key: 'chest_cm',    label: 'Pecho',      color: '#34d399' },
  { key: 'waist_cm',    label: 'Cintura',    color: 'var(--color-client)' },
  { key: 'abdomen_cm',  label: 'Abdomen',    color: '#fb923c' },
  { key: 'hip_cm',      label: 'Cadera',     color: '#f472b6' },
  { key: 'arm_cm',      label: 'Brazo',      color: '#4ade80' },
  { key: 'thigh_cm',    label: 'Muslo',      color: '#facc15' },
  { key: 'calf_cm',     label: 'Pantorrilla', color: '#94a3b8' },
]

function MedidasTab({
  measurements,
  thisWeekMeasurement,
  onAdd,
}: {
  measurements: BodyMeasurement[]
  thisWeekMeasurement: BodyMeasurement | null
  onAdd: () => void
}) {
  const latest = measurements[0]
  const comp = latest?.weight_kg && latest?.height_cm
    ? (() => {
        const bmi = calcBMI(latest.weight_kg, latest.height_cm)
        const cat = bmiCategory(bmi)
        const fatKg = latest.body_fat_pct != null ? Math.round(latest.weight_kg * latest.body_fat_pct) / 10 : null
        const leanKg = fatKg != null ? Math.round((latest.weight_kg - fatKg) * 10) / 10 : null
        return { bmi, cat, fatKg, leanKg }
      })()
    : null

  const weightHistory = [...measurements].filter((m) => m.weight_kg != null).reverse().slice(-10).map((m) => m.weight_kg as number)
  const weightChange = weightHistory.length >= 2 ? weightHistory[weightHistory.length - 1] - weightHistory[0] : null

  return (
    <div className="space-y-4">
      {thisWeekMeasurement && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-700">📅 Medición de esta semana registrada</p>
          <p className="text-xs text-amber-600 mt-0.5">Podés editar los datos de esta semana.</p>
        </div>
      )}

      {latest && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Composición corporal</p>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {new Date(latest.measured_at + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            {latest.weight_kg != null && (
              <div className="flex flex-col items-center rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 min-w-[72px]">
                <span className="text-2xl font-black text-amber-600">{latest.weight_kg}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">Peso (kg)</span>
              </div>
            )}
            {latest.height_cm != null && (
              <div className="flex flex-col items-center rounded-lg border border-[var(--color-client)]/30 px-4 py-2.5 min-w-[72px]"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-client) 10%, transparent)' }}>
                <span className="text-2xl font-black" style={{ color: 'var(--color-client)' }}>{latest.height_cm}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">Estatura (cm)</span>
              </div>
            )}
            {comp && (
              <div className="flex flex-col items-center rounded-lg border px-4 py-2.5 min-w-[72px]"
                style={{ borderColor: comp.cat.color + '44', backgroundColor: comp.cat.color + '12' }}>
                <span className="text-2xl font-black" style={{ color: comp.cat.color }}>{comp.bmi}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">IMC</span>
                <span className="text-[9px] font-bold" style={{ color: comp.cat.color }}>{comp.cat.label}</span>
              </div>
            )}
          </div>

          {/* Body composition rows */}
          {comp && (comp.fatKg != null || comp.leanKg != null) && (
            <div className="space-y-1.5 text-sm mb-4">
              {[
                { label: 'Masa grasa',     value: comp.fatKg,            unit: 'kg', color: '#f59e0b' },
                { label: '% Grasa corp.',  value: latest.body_fat_pct,   unit: '%',  color: '#f59e0b' },
                { label: 'Masa magra',     value: comp.leanKg,           unit: 'kg', color: '#22c55e' },
              ].filter((r) => r.value != null).map((r) => (
                <div key={r.label} className="flex justify-between py-1.5 border-b border-[var(--color-border)]/40 last:border-0">
                  <span className="text-[var(--color-muted-foreground)]">{r.label}</span>
                  <span className="font-semibold" style={{ color: r.color }}>
                    {r.value} <span className="text-xs font-normal text-[var(--color-muted-foreground)]">{r.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Circumference grid */}
          {CIRCUM_FIELDS.some((f) => (latest[f.key] as number | null) != null) && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted-foreground)] mb-2 uppercase tracking-wide">Circunferencias</p>
              <div className="grid grid-cols-3 gap-2">
                {CIRCUM_FIELDS.map((f) => {
                  const v = latest[f.key] as number | null
                  if (v == null) return null
                  return (
                    <div key={f.key as string} className="flex flex-col items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-2 text-center">
                      <span className="text-base font-black" style={{ color: f.color }}>{v}</span>
                      <span className="text-[9px] text-[var(--color-muted-foreground)] mt-0.5">{f.label} cm</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison card */}
      <ComparisonCard measurements={measurements} />

      {weightHistory.length >= 2 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Evolución de peso</p>
            {weightChange != null && (
              <span className="text-sm font-bold" style={{ color: weightChange < 0 ? '#22c55e' : weightChange > 0 ? '#f59e0b' : 'var(--color-muted-foreground)' }}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </span>
            )}
          </div>
          <div className="flex items-end gap-1 h-16">
            {weightHistory.map((v, i) => {
              const min = Math.min(...weightHistory)
              const max = Math.max(...weightHistory)
              const range = max - min || 1
              const h = 4 + ((v - min) / range) * 44
              return <div key={i} className="flex-1 rounded-sm" style={{ height: h, backgroundColor: i === weightHistory.length - 1 ? '#f59e0b' : '#f59e0b66' }} />
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-[var(--color-muted-foreground)]">
            <span>Mín: {Math.min(...weightHistory)} kg</span>
            <span>Máx: {Math.max(...weightHistory)} kg</span>
          </div>
        </div>
      )}

      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: '#f59e0b' }}
      >
        <Plus size={16} />
        {thisWeekMeasurement ? 'Editar medición de esta semana' : 'Registrar medición de hoy'}
      </button>

      {!thisWeekMeasurement && measurements.length > 0 && (
        <p className="text-xs text-center text-[var(--color-muted-foreground)]">
          Solo se permite 1 medición por semana (lun–dom). Podés editar la de esta semana en cualquier momento.
        </p>
      )}

      {measurements.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-sm font-semibold text-[var(--color-foreground)] mb-3">Historial</p>
          <div className="space-y-0">
            {measurements.slice(0, 12).map((m, i) => {
              const c = m.weight_kg && m.height_cm ? (() => { const bmi = calcBMI(m.weight_kg!, m.height_cm!); return { bmi, cat: bmiCategory(bmi) } })() : null
              const circumStr = [
                m.waist_cm   && `cin ${m.waist_cm}`,
                m.abdomen_cm && `abd ${m.abdomen_cm}`,
                m.hip_cm     && `cad ${m.hip_cm}`,
                m.arm_cm     && `bra ${m.arm_cm}`,
                m.thigh_cm   && `mus ${m.thigh_cm}`,
                m.calf_cm    && `pan ${m.calf_cm}`,
              ].filter(Boolean).join(' · ')
              return (
                <div key={m.id} className={`flex items-start justify-between py-2.5 ${i < Math.min(measurements.length, 12) - 1 ? 'border-b border-[var(--color-border)]/50' : ''}`}>
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {new Date(m.measured_at + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    {circumStr && <p className="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">{circumStr}</p>}
                    {m.notes && <p className="text-xs text-[var(--color-muted-foreground)] italic">{m.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {m.weight_kg != null && <p className="text-sm font-bold text-amber-600">{m.weight_kg} kg</p>}
                    {m.body_fat_pct != null && <p className="text-[10px] text-[var(--color-muted-foreground)]">{m.body_fat_pct}% grasa</p>}
                    {c && <p className="text-[10px] font-semibold" style={{ color: c.cat.color }}>IMC {c.bmi}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {measurements.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center">
          <p className="text-3xl mb-3">📏</p>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Sin mediciones aún</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Registrá tu peso y medidas para hacer seguimiento de tu composición corporal.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Racha ────────────────────────────────────────────────

function RachaTab({ streak }: { streak: StreakData }) {
  const { currentStreak, longestStreak } = streak
  const totalActive = streak.activeDates.length

  const msg = currentStreak === 0 ? 'Empieza hoy tu racha'
    : currentStreak < 3   ? '¡Buen inicio, sigue así!'
    : currentStreak < 7   ? '¡Vas muy bien!'
    : currentStreak < 14  ? '¡Semanas seguidas!'
    : currentStreak < 30  ? '¡Increíble constancia!'
    : '¡Leyenda del gym!'

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-[var(--color-card)] p-6 text-center">
        <p className="text-5xl mb-2">🔥</p>
        <p className="text-7xl font-black text-amber-500 leading-none">{currentStreak}</p>
        <p className="text-base font-bold text-[var(--color-foreground)] mt-1">días de racha</p>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{msg}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { value: currentStreak, label: 'Racha actual', color: '#f59e0b' },
          { value: longestStreak, label: 'Mejor racha',  color: '#22c55e' },
          { value: totalActive,   label: 'Días activos', color: 'var(--color-client)' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-center">
            <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <p className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Últimas 5 semanas</p>
        <StreakCalendar activeDates={streak.activeDates} />
      </div>

      {currentStreak === 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800 mb-1">💡 ¿Cómo funciona la racha?</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Completá al menos un ejercicio de tu rutina cada día para mantener tu racha activa. Si un día no entrenás, la racha se reinicia.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

const TABS = [
  { id: 'routines', label: 'Rutinas', icon: TrendingUp },
  { id: 'measures', label: 'Medidas', icon: Scale },
  { id: 'streak',   label: 'Racha',   icon: Flame },
] as const

type TabId = typeof TABS[number]['id']

export function ProgressClient({ measurements, dailyProgress, streak, thisWeekMeasurement, gender }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('routines')
  const [showWizard, setShowWizard] = useState(false)

  const wizardExisting: WizardMeasurement | null = thisWeekMeasurement
    ? {
        weight_kg:    thisWeekMeasurement.weight_kg,
        height_cm:    thisWeekMeasurement.height_cm,
        body_fat_pct: thisWeekMeasurement.body_fat_pct,
        neck_cm:      thisWeekMeasurement.neck_cm,
        shoulder_cm:  thisWeekMeasurement.shoulder_cm,
        chest_cm:     thisWeekMeasurement.chest_cm,
        waist_cm:     thisWeekMeasurement.waist_cm,
        abdomen_cm:   thisWeekMeasurement.abdomen_cm,
        hip_cm:       thisWeekMeasurement.hip_cm,
        arm_cm:       thisWeekMeasurement.arm_cm,
        thigh_cm:     thisWeekMeasurement.thigh_cm,
        calf_cm:      thisWeekMeasurement.calf_cm,
        notes:        thisWeekMeasurement.notes,
      }
    : null

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-all"
            style={
              activeTab === id
                ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }
                : { backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }
            }
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'routines' && <RoutinasTab dailyProgress={dailyProgress} streak={streak} />}
      {activeTab === 'measures' && (
        <MedidasTab
          measurements={measurements}
          thisWeekMeasurement={thisWeekMeasurement}
          onAdd={() => setShowWizard(true)}
        />
      )}
      {activeTab === 'streak' && <RachaTab streak={streak} />}

      <MeasurementWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        existing={wizardExisting}
        gender={gender as Gender | null}
      />
    </>
  )
}
