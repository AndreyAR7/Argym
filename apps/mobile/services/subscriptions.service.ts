import { supabase } from '@/lib/supabase';

export interface PlanRecord {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  billing_cycle: string;
  is_active: boolean;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date?: string | null;
  final_price?: number | null;
  plan?: PlanRecord | null;
}

interface RawSubscriptionRow {
  id: string;
  user_id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date?: string | null;
  final_price?: number | null;
  plans: PlanRecord | null;
}

export async function getTenantPlans(): Promise<PlanRecord[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, description, price, currency, billing_cycle, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanRecord[];
}

export async function getClientSubscription(userId: string): Promise<SubscriptionRecord | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, tenant_id, plan_id, status, start_date, end_date, final_price, plans(id, name, price, currency, billing_cycle)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as RawSubscriptionRow;
  return { ...row, plan: row.plans ?? null };
}

// Uses a SECURITY DEFINER RPC so cancel + insert run in one transaction.
// This prevents the user from being left without a plan if the insert fails.
export async function assignPlanToClient(
  userId: string,
  tenantId: string,
  planId: string,
  planPrice: number
): Promise<void> {
  const { error } = await supabase.rpc('assign_plan', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_plan_id: planId,
    p_price: planPrice,
  });
  if (error) throw error;
}
