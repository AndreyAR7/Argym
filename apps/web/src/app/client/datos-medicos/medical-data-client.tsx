'use client'

import { useRouter } from 'next/navigation'
import { MedicalRecordForm, type MedicalRecordData } from '@/components/shared/medical-record-form'
import { upsertOwnMedicalRecordAction } from '@/lib/client/medical-actions'

interface Props {
  record: MedicalRecordData | null
}

export function MedicalDataClient({ record }: Props) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4">
      {record?.status === 'completed' && (
        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          Última actualización: {record.updated_at ? new Date(record.updated_at).toLocaleDateString('es-CR') : '—'}
          {record.filled_by_role === 'staff' ? ' · completada por el equipo del gimnasio' : ''}
        </p>
      )}
      <MedicalRecordForm
        initial={record}
        onSave={upsertOwnMedicalRecordAction}
        onSaved={() => router.refresh()}
      />
    </div>
  )
}
