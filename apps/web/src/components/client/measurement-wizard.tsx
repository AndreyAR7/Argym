'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, ArrowLeft, Save } from 'lucide-react'
import { BodySilhouette, MeasureZone, Gender } from './body-silhouette'
import { upsertBodyMeasurementAction } from '@/lib/client/actions'

// ─── Step definitions ─────────────────────────────────────────

const STEP_DEFS = [
  { key: 'weight_kg',    unit: 'kg', zone: 'weight'   as MeasureZone, required: true,  step: 0.1 },
  { key: 'height_cm',   unit: 'cm', zone: 'height'   as MeasureZone, required: false, step: 0.5 },
  { key: 'body_fat_pct', unit: '%', zone: 'weight'   as MeasureZone, required: false, step: 0.1 },
  { key: 'neck_cm',     unit: 'cm', zone: 'neck'     as MeasureZone, required: false, step: 0.5 },
  { key: 'shoulder_cm', unit: 'cm', zone: 'shoulder' as MeasureZone, required: false, step: 0.5 },
  { key: 'chest_cm',    unit: 'cm', zone: 'chest'    as MeasureZone, required: false, step: 0.5 },
  { key: 'waist_cm',    unit: 'cm', zone: 'waist'    as MeasureZone, required: false, step: 0.5 },
  { key: 'abdomen_cm',  unit: 'cm', zone: 'abdomen'  as MeasureZone, required: false, step: 0.5 },
  { key: 'hip_cm',      unit: 'cm', zone: 'hip'      as MeasureZone, required: false, step: 0.5 },
  { key: 'arm_cm',      unit: 'cm', zone: 'arm'      as MeasureZone, required: false, step: 0.5 },
  { key: 'thigh_cm',    unit: 'cm', zone: 'thigh'    as MeasureZone, required: false, step: 0.5 },
  { key: 'calf_cm',     unit: 'cm', zone: 'calf'     as MeasureZone, required: false, step: 0.5 },
] as const

type StepKey = typeof STEP_DEFS[number]['key']

const STEP_LABELS: Record<StepKey, { label: string; tip: string }> = {
  weight_kg:    { label: 'Peso',            tip: 'Párate en la báscula sin zapatos, en ayunas si es posible' },
  height_cm:    { label: 'Estatura',         tip: 'Párate erguido contra la pared, sin zapatos' },
  body_fat_pct: { label: '% Grasa corporal', tip: 'Ingrésalo de tu báscula inteligente o medidor de grasa corporal' },
  neck_cm:      { label: 'Cuello',           tip: 'Mide justo debajo de la laringe (nuez de Adán), cinta horizontal' },
  shoulder_cm:  { label: 'Hombros',          tip: 'Mide el punto más ancho de hombro a hombro, brazos relajados' },
  chest_cm:     { label: 'Pecho',            tip: 'Mide a la altura de las axilas, exhalando suavemente' },
  waist_cm:     { label: 'Cintura',          tip: 'Mide la parte más estrecha del torso, entre costillas y cadera' },
  abdomen_cm:   { label: 'Abdomen',          tip: 'Mide a nivel del ombligo, sin meter la barriga' },
  hip_cm:       { label: 'Cadera',           tip: 'Mide el punto más ancho de la cadera y glúteos' },
  arm_cm:       { label: 'Brazo (bíceps)',   tip: 'Bíceps contraído, a la mitad entre hombro y codo' },
  thigh_cm:     { label: 'Muslo',            tip: 'A la mitad del muslo, de pie, peso distribuido en ambas piernas' },
  calf_cm:      { label: 'Pantorrilla',      tip: 'En el punto más ancho de la pantorrilla, de pie' },
}

// ─── Types ────────────────────────────────────────────────────

export interface WizardMeasurement {
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

interface Props {
  open: boolean
  onClose: () => void
  existing: WizardMeasurement | null
  gender: Gender | null
}

type StepValues = Partial<Record<StepKey, string>>

function parseNum(v: string | undefined): number | null {
  if (!v) return null
  const n = parseFloat(v)
  return isNaN(n) || n <= 0 ? null : n
}

// ─── Wizard ───────────────────────────────────────────────────

export function MeasurementWizard({ open, onClose, existing, gender }: Props) {
  const [step, setStep] = useState(0)
  const [isReview, setIsReview] = useState(false)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [values, setValues] = useState<StepValues>(() => {
    if (!existing) return {}
    const init: StepValues = {}
    for (const s of STEP_DEFS) {
      const val = existing[s.key as keyof WizardMeasurement]
      if (val != null) init[s.key] = val.toString()
    }
    return init
  })

  // Reset wizard to step 0 every time the modal opens
  useEffect(() => {
    if (open) {
      setStep(0)
      setIsReview(false)
      setError(null)
    }
  }, [open])

  if (!open) return null

  const totalSteps = STEP_DEFS.length
  const currentDef = STEP_DEFS[step]
  const currentVal = values[currentDef.key] ?? ''

  const completedZones = STEP_DEFS
    .filter((s, i) => i < step && values[s.key])
    .map((s) => s.zone)

  function setVal(v: string) {
    setValues((prev) => ({ ...prev, [currentDef.key]: v }))
  }

  function goNext() {
    if (step >= totalSteps - 1) setIsReview(true)
    else setStep((s) => s + 1)
  }

  function handleSave() {
    const weightNum = parseNum(values.weight_kg)
    if (!weightNum) { setError('El peso es requerido'); return }
    setError(null)

    startTransition(async () => {
      const result = await upsertBodyMeasurementAction({
        weight_kg: weightNum,
        height_cm: parseNum(values.height_cm),
        body_fat_pct: parseNum(values.body_fat_pct),
        neck_cm: parseNum(values.neck_cm),
        shoulder_cm: parseNum(values.shoulder_cm),
        chest_cm: parseNum(values.chest_cm),
        waist_cm: parseNum(values.waist_cm),
        abdomen_cm: parseNum(values.abdomen_cm),
        hip_cm: parseNum(values.hip_cm),
        arm_cm: parseNum(values.arm_cm),
        thigh_cm: parseNum(values.thigh_cm),
        calf_cm: parseNum(values.calf_cm),
        notes: notes.trim() || null,
      })
      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-[#1E2040] bg-[#0D0D1A] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2040]">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold tracking-widest text-[#00C8FF] uppercase">
              MEDICIÓN CORPORAL
            </p>
            {!isReview && (
              <span className="text-xs text-gray-500">
                Paso {step + 1} de {totalSteps}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {!isReview ? (
          /* ── Step view ── */
          <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">

            {/* Silhouette panel */}
            <div className="sm:w-44 flex-shrink-0 flex items-center justify-center bg-[#080812] p-4">
              <BodySilhouette
                gender={gender}
                activeZone={currentDef.zone}
                completedZones={completedZones}
                className="h-44 sm:h-72 w-auto"
              />
            </div>

            {/* Step content */}
            <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
              {/* Progress bar */}
              <div className="h-1 w-full rounded-full bg-[#1A1B38] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#00C8FF] transition-all duration-300"
                  style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                />
              </div>

              {/* Label + tip */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-xl font-black text-white">
                    {STEP_LABELS[currentDef.key].label}
                  </h3>
                  {currentDef.required && (
                    <span className="text-[10px] border border-[#00C8FF]/40 text-[#00C8FF] px-1.5 py-0.5 rounded font-medium">
                      requerido
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {STEP_LABELS[currentDef.key].tip}
                </p>
              </div>

              {/* Number input */}
              <div className="relative">
                <input
                  key={step}
                  type="number"
                  value={currentVal}
                  onChange={(e) => setVal(e.target.value)}
                  step={currentDef.step}
                  min="0"
                  placeholder={`0.0`}
                  autoFocus
                  className="w-full px-4 py-3 pr-14 text-2xl font-black text-white bg-[#12122A] border border-[#1E2040] rounded-xl outline-none focus:border-[#00C8FF] focus:ring-2 focus:ring-[#00C8FF]/20 placeholder:text-gray-700 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                  {currentDef.unit}
                </span>
              </div>

              {/* Navigation */}
              <div className="flex gap-2 mt-auto">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-400 hover:text-white border border-[#1E2040] rounded-lg transition-colors"
                  >
                    <ArrowLeft size={13} /> Atrás
                  </button>
                )}
                {!currentDef.required && (
                  <button
                    onClick={goNext}
                    className="px-3 py-2.5 text-sm text-gray-400 hover:text-white border border-[#1E2040] rounded-lg transition-colors"
                  >
                    Omitir
                  </button>
                )}
                <button
                  onClick={goNext}
                  className="flex-1 py-2.5 text-sm font-semibold text-black bg-[#00C8FF] rounded-lg hover:opacity-90 transition-opacity"
                >
                  {step >= totalSteps - 1 ? 'Ver resumen →' : 'Siguiente →'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Review view ── */
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">¡Listo! Revisa tus medidas</h3>
              <p className="text-xs text-gray-500 mt-0.5">Confirma los datos antes de guardar</p>
            </div>

            <div className="space-y-1.5">
              {STEP_DEFS.map((s) => {
                const v = values[s.key]
                if (!v) return null
                return (
                  <div key={s.key} className="flex justify-between items-center py-2 px-3 rounded-lg bg-[#12122A]">
                    <span className="text-sm text-gray-400">{STEP_LABELS[s.key].label}</span>
                    <span className="text-sm font-bold text-white">
                      {v} <span className="text-gray-500 font-normal text-xs">{s.unit}</span>
                    </span>
                  </div>
                )
              })}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: tomé las medidas en ayunas..."
                className="w-full px-3.5 py-2.5 text-sm text-white bg-[#12122A] border border-[#1E2040] rounded-lg outline-none focus:border-[#00C8FF] focus:ring-2 focus:ring-[#00C8FF]/20 placeholder:text-gray-700 transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pb-2">
              <button
                onClick={() => setIsReview(false)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-400 hover:text-white border border-[#1E2040] rounded-lg transition-colors"
              >
                <ArrowLeft size={13} /> Editar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-black bg-[#00C8FF] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save size={14} />
                {isPending ? 'Guardando…' : 'Guardar medición'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
