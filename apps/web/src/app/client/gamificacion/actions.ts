'use server'

import { getSessionData } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/server-admin'

export interface CheckinResult {
  success: boolean
  already_checked_in?: boolean
  xp_earned?: number
  new_streak?: number
  new_badges?: Array<{ id: string; name: string; icon: string }>
  new_level?: number | null
  error?: string
}

export async function checkinAction(): Promise<CheckinResult> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }

  const { supabase, tenantId, user } = session
  const userId = user.id

  const { data, error } = await supabase.rpc('award_checkin', {
    p_user_id: userId,
    p_tenant_id: tenantId,
  })

  if (error) return { success: false, error: error.message }
  return data as CheckinResult
}

export async function acceptChallengeAction(
  challengeId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }

  const { supabase, user } = session

  const { error } = await supabase
    .from('challenge_participants')
    .update({ status: 'accepted' })
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function declineChallengeAction(
  challengeId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }

  const { supabase, tenantId, user } = session

  const { error } = await supabase
    .from('challenge_participants')
    .update({ status: 'declined' })
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function completeChallengeAction(
  challengeId: string,
): Promise<{ success: boolean; xp_earned?: number; error?: string }> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }

  const { supabase, user } = session

  const { data, error } = await supabase.rpc('complete_challenge_entry', {
    p_challenge_id: challengeId,
    p_user_id: user.id,
  })

  if (error) return { success: false, error: error.message }
  return data as { success: boolean; xp_earned?: number }
}

export async function getTenantMembersAction(): Promise<
  { id: string; full_name: string }[]
> {
  const session = await getSessionData()
  if (!session) return []

  const { supabase, tenantId, user } = session

  const { data } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .eq('tenant_id', tenantId)
    .eq('role', 'client')
    .neq('user_id', user.id)
    .order('full_name')

  return (data ?? []).map((p) => ({
    id: p.user_id as string,
    full_name: (p.full_name as string) ?? 'Sin nombre',
  }))
}

export async function createChallengeAction(params: {
  title: string
  description: string
  challengeType: 'global' | '1v1' | 'group'
  xpReward: number
  expiresIn: '1w' | '2w' | '1m' | null
  opponentId?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }

  if (params.challengeType === '1v1' && !params.opponentId) {
    return { success: false, error: 'Debes seleccionar un oponente para el reto 1v1.' }
  }

  const { supabase, tenantId, user } = session

  let expiresAt: string | null = null
  if (params.expiresIn) {
    const d = new Date()
    if (params.expiresIn === '1w') d.setDate(d.getDate() + 7)
    else if (params.expiresIn === '2w') d.setDate(d.getDate() + 14)
    else if (params.expiresIn === '1m') d.setMonth(d.getMonth() + 1)
    expiresAt = d.toISOString()
  }

  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .insert({
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
      max_participants: params.challengeType === '1v1' ? 2 : null,
    })
    .select('id')
    .single()

  if (challengeError) return { success: false, error: challengeError.message }

  // Creator joins as accepted
  await supabase.from('challenge_participants').insert({
    challenge_id: challenge.id,
    user_id: user.id,
    status: 'accepted',
    invited_by: user.id,
  })

  // For 1v1: invite the opponent via service role (bypasses own-write RLS)
  if (params.challengeType === '1v1' && params.opponentId) {
    const adminClient = await createAdminClient()
    await adminClient.from('challenge_participants').insert({
      challenge_id: challenge.id,
      user_id: params.opponentId,
      status: 'pending',
      invited_by: user.id,
    })
  }

  return { success: true, id: challenge.id }
}
