import { supabase } from '@/lib/supabase';
import type { Plan } from '@/store/plans.store';

export async function getOfferPlanIds(offerId: string): Promise<string[]> {
  const { data } = await supabase
    .from('offer_plans')
    .select('plan_id')
    .eq('offer_id', offerId);
  return (data ?? []).map((r: any) => r.plan_id as string);
}

export async function getOfferPlans(offerId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('offer_plans')
    .select('plans(*)')
    .eq('offer_id', offerId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.plans).filter(Boolean) as Plan[];
}

export async function setOfferPlans(offerId: string, planIds: string[]): Promise<void> {
  await supabase.from('offer_plans').delete().eq('offer_id', offerId);
  if (planIds.length === 0) return;
  const { error } = await supabase
    .from('offer_plans')
    .insert(planIds.map((plan_id) => ({ offer_id: offerId, plan_id })));
  if (error) throw error;
}
