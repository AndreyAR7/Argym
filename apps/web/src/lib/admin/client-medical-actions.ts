'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { MedicalRecordInput } from '@/lib/client/medical-actions'

export async function upsertClientMedicalRecordAction(clientId: string, data: MedicalRecordInput) {
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
        client_id: clientId,
        tenant_id: profile.tenant_id,
        ...data,
        status: data.liability_acknowledged ? 'completed' : 'pending',
        filled_by: user.id,
        filled_by_role: 'staff',
        completed_at: data.liability_acknowledged ? new Date().toISOString() : null,
      },
      { onConflict: 'client_id' },
    )

  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  return { success: true }
}
