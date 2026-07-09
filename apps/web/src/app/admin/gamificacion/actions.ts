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

export async function createAdminChallengeAction(params: {
  title: string
  description: string
  challengeType: 'global' | '1v1' | 'group'
  xpReward: number
  expiresIn: '1w' | '2w' | '1m' | null
}): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }
  const { supabase, tenantId, user } = session

  let expiresAt: string | null = null
  if (params.expiresIn) {
    const d = new Date()
    if (params.expiresIn === '1w') d.setDate(d.getDate() + 7)
    else if (params.expiresIn === '2w') d.setDate(d.getDate() + 14)
    else if (params.expiresIn === '1m') d.setMonth(d.getMonth() + 1)
    expiresAt = d.toISOString()
  }

  const { error } = await supabase.from('challenges').insert({
    tenant_id: tenantId,
    creator_id: user.id,
    challenge_type: params.challengeType,
    title: params.title.trim(),
    description: params.description.trim() || null,
    target_metric: 'checkins',
    target_value: 1,
    xp_reward: params.xpReward,
    status: 'active',
    starts_at: new Date().toISOString(),
    expires_at: expiresAt,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/gamificacion')
  return { success: true }
}
