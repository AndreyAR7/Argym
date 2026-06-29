'use server'

import { getSessionData } from '@/lib/auth/session'

// ---------------------------------------------------------------------------
// Return type for the check-in RPC
// ---------------------------------------------------------------------------
export interface CheckinResult {
  success: boolean
  already_checked_in?: boolean
  xp_earned?: number
  new_streak?: number
  new_badges?: Array<{ id: string; name: string; icon: string }>
  new_level?: number | null
  error?: string
}

// ---------------------------------------------------------------------------
// checkinAction — calls the award_checkin Postgres function
// ---------------------------------------------------------------------------
export async function checkinAction(): Promise<CheckinResult> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }

  const { supabase, tenantId, userId } = session as any

  const { data, error } = await supabase.rpc('award_checkin', {
    p_user_id: userId,
    p_tenant_id: tenantId,
  })

  if (error) return { success: false, error: error.message }
  return data as CheckinResult
}

// ---------------------------------------------------------------------------
// acceptChallengeAction — marks a challenge_participant row as accepted
// ---------------------------------------------------------------------------
export async function acceptChallengeAction(
  challengeId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }

  const { supabase, userId } = session as any

  const { error } = await supabase
    .from('challenge_participants')
    .update({ status: 'accepted' })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// declineChallengeAction — marks a challenge_participant row as declined
// ---------------------------------------------------------------------------
export async function declineChallengeAction(
  challengeId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }

  const { supabase, tenantId, userId } = session as any

  const { error } = await supabase
    .from('challenge_participants')
    .update({ status: 'declined' })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ---------------------------------------------------------------------------
// completeChallengeAction — calls the complete_challenge_entry RPC
// ---------------------------------------------------------------------------
export async function completeChallengeAction(
  challengeId: string,
): Promise<{ success: boolean; xp_earned?: number; error?: string }> {
  const session = await getSessionData()
  if (!session) return { success: false, error: 'No autenticado' }

  const { supabase, tenantId, userId } = session as any

  const { data, error } = await supabase.rpc('complete_challenge_entry', {
    p_challenge_id: challengeId,
    p_user_id: userId,
    p_tenant_id: tenantId,
  })

  if (error) return { success: false, error: error.message }
  return data as { success: boolean; xp_earned?: number }
}
