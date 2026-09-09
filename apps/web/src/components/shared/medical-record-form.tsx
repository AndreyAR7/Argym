'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import type { MedicalRecordInput } from '@/lib/client/medical-actions'

export interface MedicalRecordData extends MedicalRecordInput {
  status: 'pending' | 'completed'
  filled_by_role: 'client' | 'staff' | null
  updated_at: string | null
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const EMPTY: MedicalRecordInput = {
  blood_type: null,
  conditions: null,
  injuries: null,
  allergies: null,
  medications: null,
  physical_limitations: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relationship: null,
  has_medical_clearance: false,
  liability_acknowledged: false,
}

interface Props {
  initial: Partial<MedicalRecordData> | null
  onSave: (data: MedicalRecordInput) => Promise<{ error?: string; success?: boolean }>
  onSaved?: () => void
  saveLabel?: string
}

export function MedicalRecordForm({ initial, onSave, onSaved, saveLabel = 'Guardar' }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [bloodType, setBloodType]           = useState(initial?.blood_type ?? '')
  const [conditions, setConditions]         = useState(initial?.conditions ?? '')
  const [injuries, setInjuries]             = useState(initial?.injuries ?? '')
  const [allergies, setAllergies]           = useState(initial?.allergies ?? '')
  const [medications, setMedications]       = useState(initial?.medications ?? '')
  const [limitations, setLimitations]       = useState(initial?.physical_limitations ?? '')
  const [contactName, setContactName]       = useState(initial?.emergency_contact_name ?? '')
  const [contactPhone, setContactPhone]     = useState(initial?.emergency_contact_phone ?? '')
  const [contactRel, setContactRel]         = useState(initial?.emergency_contact_relationship ?? '')
  const [clearance, setClearance]           = useState(initial?.has_medical_clearance ?? false)
  const [acknowledged, setAcknowledged]     = useState(initial?.liability_acknowledged ?? false)

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const data: MedicalRecordInput = {
      blood_type: bloodType || null,
      conditions: conditions.trim() || null,
      injuries: injuries.trim() || null,
      allergies: allergies.trim() || null,
      medications: medications.trim() || null,
      physical_limitations: limitations.trim() || null,
      emergency_contact_name: contactName.trim() || null,
      emergency_contact_phone: contactPhone.trim() || null,
      emergency_contact_relationship: contactRel.trim() || null,
      has_medical_clearance: clearance,
      liability_acknowledged: acknowledged,
    }

    startTransition(async () => {
      const result = await onSave(data)
      if (result?.error) { setError(result.error); return }
      setSaved(true)
      onSaved?.()
    })
  }

  const label = 'text-sm font-medium'
  const field = 'rounded-lg px-3 py-2 text-sm outline-none w-full'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={label} style={{ color: 'var(--color-foreground)' }}>Tipo de sangre</label>
          <select value={bloodType} onChange={e => setBloodType(e.target.value)} className={field} style={inputStyle}>
            <option value="">No especifica</option>
            {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
            <input type="checkbox" checked={clearance} onChange={e => setClearance(e.target.checked)} />
            Cuenta con autorización médica para ejercitarse
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className={label} style={{ color: 'var(--color-foreground)' }}>Padecimientos / enfermedades crónicas</label>
        <textarea value={conditions} onChange={e => setConditions(e.target.value)} rows={2}
          placeholder="Ej. hipertensión, diabetes, asma… o &quot;ninguno&quot;"
          className={field + ' resize-none'} style={inputStyle} />
      </div>

      <div className="flex flex-col gap-1">
        <label className={label} style={{ color: 'var(--color-foreground)' }}>Lesiones o incapacidades (actuales o pasadas)</label>
        <textarea value={injuries} onChange={e => setInjuries(e.target.value)} rows={2}
          placeholder="Ej. lesión de rodilla en 2023, hernia lumbar… o &quot;ninguna&quot;"
          className={field + ' resize-none'} style={inputStyle} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={label} style={{ color: 'var(--color-foreground)' }}>Alergias</label>
          <textarea value={allergies} onChange={e => setAllergies(e.target.value)} rows={2}
            className={field + ' resize-none'} style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={label} style={{ color: 'var(--color-foreground)' }}>Medicamentos actuales</label>
          <textarea value={medications} onChange={e => setMedications(e.target.value)} rows={2}
            className={field + ' resize-none'} style={inputStyle} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className={label} style={{ color: 'var(--color-foreground)' }}>Limitaciones físicas relevantes para entrenar</label>
        <textarea value={limitations} onChange={e => setLimitations(e.target.value)} rows={2}
          className={field + ' resize-none'} style={inputStyle} />
      </div>

      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--color-muted)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
          Contacto de emergencia
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
            placeholder="Nombre" className={field} style={inputStyle} />
          <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
            placeholder="Teléfono" className={field} style={inputStyle} />
          <input type="text" value={contactRel} onChange={e => setContactRel(e.target.value)}
            placeholder="Parentesco / relación" className={field} style={inputStyle} />
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm cursor-pointer rounded-lg p-3"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', color: 'var(--color-foreground)' }}>
        <input type="checkbox" className="mt-0.5" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
        <span>
          <ShieldCheck size={13} className="inline mr-1 -mt-0.5" style={{ color: 'var(--color-primary)' }} />
          Declaro que la información suministrada es verídica y completa, y exonero al gimnasio de responsabilidad
          por condiciones de salud no informadas.
        </span>
      </label>
      {!acknowledged && (
        <p className="text-xs -mt-2" style={{ color: 'var(--color-muted-foreground)' }}>
          Sin marcar esta declaración, la ficha se guarda como &quot;Pendiente&quot;.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)', color: 'var(--color-destructive)' }}>
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {saved && !error && (
        <p className="text-xs" style={{ color: 'var(--color-primary)' }}>Ficha guardada correctamente.</p>
      )}

      <button type="submit" disabled={isPending}
        className="self-end rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-primary)' }}>
        {isPending ? 'Guardando…' : saveLabel}
      </button>
    </form>
  )
}
