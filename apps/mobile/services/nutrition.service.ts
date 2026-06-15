import { supabase } from '@/lib/supabase';
import type { NutritionPlan, NutritionAssignment, NutritionStatus } from '@/types/nutrition';

// ── Admin ────────────────────────────────────────────────────────
export async function fetchNutritionPlansAdmin(tenantId: string): Promise<NutritionPlan[]> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NutritionPlan[];
}

export async function createNutritionPlan(
  plan: Omit<NutritionPlan, 'id' | 'created_at' | 'updated_at'>
): Promise<NutritionPlan> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .insert(plan)
    .select()
    .single();
  if (error) throw error;
  return data as NutritionPlan;
}

export async function updateNutritionPlan(
  id: string,
  updates: Partial<Omit<NutritionPlan, 'id' | 'tenant_id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('nutrition_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNutritionPlan(id: string): Promise<void> {
  const { error } = await supabase.from('nutrition_plans').delete().eq('id', id);
  if (error) throw error;
}

export async function setNutritionStatus(id: string, status: NutritionStatus): Promise<void> {
  const { error } = await supabase
    .from('nutrition_plans')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Assignments ──────────────────────────────────────────────────
export async function assignNutritionPlan(
  planId: string,
  clientId: string,
  tenantId: string,
  assignedBy: string,
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from('nutrition_assignments')
    .upsert(
      { nutrition_plan_id: planId, client_id: clientId, tenant_id: tenantId, assigned_by: assignedBy, note: note ?? null },
      { onConflict: 'nutrition_plan_id,client_id' }
    );
  if (error) throw error;
}

export async function removeNutritionAssignment(planId: string, clientId: string): Promise<void> {
  const { error } = await supabase
    .from('nutrition_assignments')
    .delete()
    .eq('nutrition_plan_id', planId)
    .eq('client_id', clientId);
  if (error) throw error;
}

export async function fetchClientNutritionPlan(tenantId: string, clientId: string): Promise<NutritionAssignment | null> {
  const { data, error } = await supabase
    .from('nutrition_assignments')
    .select('*, nutrition_plan:nutrition_plans(*)')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data as NutritionAssignment | null;
}
