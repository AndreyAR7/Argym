'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface MedicalRecordInput {
  blood_type: string | null
  conditions: string | null
  injuries: string | null
  allergies: string | null
  medications: string | null
  physical_limitations: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  has_medical_clearance: boolean
  liability_acknowledged: boolean
}

export async function upsertOwnMedicalRecordAction(data: MedicalRecordInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile) return { error: 'Perfil no encontrado' }

  const { error } = await supabase
    .from('client_medical_records')
    .upsert(
      {
        client_id: user.id,
        tenant_id: profile.tenant_id,
        ...data,
        status: data.liability_acknowledged ? 'completed' : 'pending',
        filled_by: user.id,
        filled_by_role: 'client',
        completed_at: data.liability_acknowledged ? new Date().toISOString() : null,
      },
      { onConflict: 'client_id' },
    )

  if (error) return { error: error.message }
  revalidatePath('/client/datos-medicos')
  return { success: true }
}
