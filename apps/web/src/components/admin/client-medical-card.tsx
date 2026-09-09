'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil, HeartPulse } from 'lucide-react'
import { MedicalRecordForm, type MedicalRecordData } from '@/components/shared/medical-record-form'
import { upsertClientMedicalRecordAction } from '@/lib/admin/client-medical-actions'

interface Props {
  clientId: string
  record: MedicalRecordData | null
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  completed: { label: 'Completa',  bg: 'color-mix(in srgb, #22c55e 12%, transparent)', color: '#16a34a' },
  pending:   { label: 'Pendiente', bg: 'color-mix(in srgb, #f59e0b 12%, transparent)', color: '#b45309' },
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
      <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{value}</p>
    </div>
  )
}

export function ClientMedicalCard({ clientId, record }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const status = STATUS_STYLE[record?.status ?? 'pending']

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-foreground)' }}>
          <HeartPulse size={14} />
          Ficha médica
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: status.bg, color: status.color }}>
            {status.label}
          </span>
          <button onClick={() => setEditing(true)}
            className="rounded-lg p-1.5 hover:opacity-70" style={{ color: 'var(--color-admin)' }} title="Editar ficha médica">
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {record ? (
        <div className="px-6 py-4 grid grid-cols-2 gap-3">
          <Row label="Tipo de sangre" value={record.blood_type} />
          <Row label="Padecimientos" value={record.conditions} />
          <Row label="Lesiones" value={record.injuries} />
          <Row label="Alergias" value={record.allergies} />
          <Row label="Medicamentos" value={record.medications} />
          <Row label="Limitaciones físicas" value={record.physical_limitations} />
          <Row label="Contacto de emergencia" value={record.emergency_contact_name
            ? `${record.emergency_contact_name}${record.emergency_contact_phone ? ' · ' + record.emergency_contact_phone : ''}`
            : null} />
          {!record.conditions && !record.injuries && !record.allergies && !record.medications
            && !record.physical_limitations && !record.emergency_contact_name && (
            <p className="col-span-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Sin datos registrados aún.</p>
          )}
        </div>
      ) : (
        <div className="px-6 py-6 text-center">
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Este cliente aún no tiene ficha médica. Puedes llenarla en su nombre.
          </p>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setEditing(false) }}>
          <div className="w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto p-6"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Editar ficha médica</h3>
              <button onClick={() => setEditing(false)} style={{ color: 'var(--color-muted-foreground)' }}><X size={18} /></button>
            </div>
            <MedicalRecordForm
              initial={record}
              onSave={(data) => upsertClientMedicalRecordAction(clientId, data)}
              onSaved={() => { setEditing(false); router.refresh() }}
              saveLabel="Guardar ficha"
            />
          </div>
        </div>
      )}
    </div>
  )
}
