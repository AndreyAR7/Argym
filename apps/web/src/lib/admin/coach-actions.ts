'use server'

import { revalidatePath } from 'next/cache'
import { getSessionData } from '@/lib/auth/session'

export interface CoachBranchClient {
  id: string
  full_name: string | null
  avatar_url: string | null
  client_level: string | null
  /** already assigned to THIS coach */
  assigned: boolean
  /** assigned to at least one OTHER coach in the same tenant */
  hasOtherCoach: boolean
}

/** Returns clients in the coach's branch, with assignment status. */
export async function getCoachBranchClientsAction(
  coachId: string,
): Promise<{ clients?: CoachBranchClient[]; error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase, tenantId } = session

  // Get the coach's branch
  const { data: coachProfile } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('id', coachId)
    .eq('tenant_id', tenantId)
    .single()

  if (!coachProfile?.branch_id) {
    return { error: 'Este coach no tiene sucursal asignada. Asígnale una sucursal primero.' }
  }

  // All clients in this branch
  const { data: branchClients } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, client_level')
    .eq('branch_id', coachProfile.branch_id)
    .eq('tenant_id', tenantId)
    .order('full_name')

  if (!branchClients || branchClients.length === 0) {
    return { clients: [] }
  }

  const clientIds = branchClients.map((c: any) => c.id as string)

  // Current assignments for THIS coach
  const { data: myAssignments } = await supabase
    .from('coach_client_assignments')
    .select('client_id')
    .eq('coach_id', coachId)
    .in('client_id', clientIds)

  const mySet = new Set((myAssignments ?? []).map((a: any) => a.client_id as string))

  // Assignments for OTHER coaches in the same tenant (to detect conflicts)
  const { data: otherAssignments } = await supabase
    .from('coach_client_assignments')
    .select('client_id')
    .neq('coach_id', coachId)
    .eq('tenant_id', tenantId)
    .in('client_id', clientIds)

  const otherSet = new Set((otherAssignments ?? []).map((a: any) => a.client_id as string))

  const clients: CoachBranchClient[] = branchClients.map((c: any) => ({
    id:           c.id,
    full_name:    c.full_name,
    avatar_url:   c.avatar_url,
    client_level: c.client_level,
    assigned:     mySet.has(c.id),
    hasOtherCoach: otherSet.has(c.id),
  }))

  return { clients }
}

/** Assign or unassign a client from a coach. */
export async function toggleCoachClientAction(
  coachId: string,
  clientId: string,
  assign: boolean,
): Promise<{ error?: string }> {
  const session = await getSessionData()
  if (!session) return { error: 'No autenticado' }
  const { supabase, user, tenantId } = session

  if (assign) {
    const { error } = await supabase
      .from('coach_client_assignments')
      .upsert(
        { coach_id: coachId, client_id: clientId, tenant_id: tenantId, assigned_by: user.id },
        { onConflict: 'coach_id,client_id' },
      )
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('coach_client_assignments')
      .delete()
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/coaches')
  revalidatePath(`/coach/clients`)
  return {}
}
