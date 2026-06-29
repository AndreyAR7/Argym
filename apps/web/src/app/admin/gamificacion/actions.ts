'use server'

import { revalidatePath } from 'next/cache'
import { getSessionData } from '@/lib/auth/session'

export async function deactivateChallengeAction(challengeId: string): Promise<{ error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase, tenantId } = session

  const { error } = await supabase
    .from('challenges')
    .update({ status: 'inactive' })
    .eq('id', challengeId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/admin/gamificacion')
  return {}
}
