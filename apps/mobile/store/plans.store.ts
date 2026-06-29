import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface PlanFeature {
  name: string;
  value: string;
}

export interface Plan {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly' | 'one_time';
  features: PlanFeature[];
  plan_tier: 'basic' | 'medium' | 'premium';
  is_active: boolean;
  sort_order: number;
  expiry_date: string | null;
  created_at: string;
}

export interface Promotion {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  type: 'discount' | 'announcement' | 'bundle';
  discount_percentage: number | null;
  discount_amount: number | null;
  applies_to_plan_id: string | null;
  target_level: 'all' | 'beginner' | 'intermediate' | 'advanced';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  promotion_id: string | null;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  start_date: string;
  end_date: string | null;
  final_price: number | null;
  plan?: Plan;
}

interface PlansState {
  plans: Plan[];
  promotions: Promotion[];
  activePromotion: Promotion | null; // for banner/modal
  mySubscription: UserSubscription | null;  // latest active (backwards compat)
  mySubscriptions: UserSubscription[];      // all active subscriptions
  isLoadingPlans: boolean;
  isLoadingPromos: boolean;
  error: string | null;
}

interface PlansActions {
  reset: () => void;
  fetchPlans: (tenantId: string) => Promise<void>;
  fetchPromotions: (tenantId: string) => Promise<void>;
  fetchMySubscription: (userId: string, tenantId: string) => Promise<void>;
  createPlan: (plan: Omit<Plan, 'id' | 'created_at'>) => Promise<Plan>;
  updatePlan: (id: string, updates: Partial<Plan>) => Promise<void>;
  togglePlan: (id: string, isActive: boolean) => Promise<void>;
  createPromotion: (promo: Omit<Promotion, 'id' | 'created_at'>) => Promise<Promotion>;
  updatePromotion: (id: string, updates: Partial<Promotion>) => Promise<void>;
  togglePromotion: (id: string, isActive: boolean) => Promise<void>;
  subscribeToRealtime: (tenantId: string) => () => void;
  dismissPromotion: () => void;
}

export const usePlansStore = create<PlansState & PlansActions>()((set, get) => ({
  plans: [],
  promotions: [],
  activePromotion: null,
  mySubscription: null,
  mySubscriptions: [],
  isLoadingPlans: false,
  isLoadingPromos: false,
  error: null,

  reset: () => set({ plans: [], promotions: [], activePromotion: null, mySubscription: null, mySubscriptions: [], isLoadingPlans: false, isLoadingPromos: false, error: null }),

  fetchPlans: async (tenantId) => {
    set({ isLoadingPlans: true, error: null });
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      set({ plans: data ?? [], isLoadingPlans: false });
    } catch (e: any) {
      set({ isLoadingPlans: false, error: e.message });
    }
  },

  fetchPromotions: async (tenantId) => {
    set({ isLoadingPromos: true, error: null });
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .lte('start_date', now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const promos = data ?? [];
      set({
        promotions: promos,
        isLoadingPromos: false,
        activePromotion: promos.length > 0 ? promos[0] : null,
      });
    } catch (e: any) {
      set({ isLoadingPromos: false, error: e.message });
    }
  },

  fetchMySubscription: async (userId, tenantId) => {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*, plan:plans(*)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    const subs = (data ?? []) as UserSubscription[];
    set({ mySubscriptions: subs, mySubscription: subs[0] ?? null });
  },

  createPlan: async (plan) => {
    const { data, error } = await supabase
      .from('plans')
      .insert(plan)
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ plans: [...s.plans, data] }));
    return data;
  },

  updatePlan: async (id, updates) => {
    const { error } = await supabase
      .from('plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    set((s) => ({
      plans: s.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  togglePlan: async (id, isActive) => {
    await get().updatePlan(id, { is_active: isActive });
  },

  createPromotion: async (promo) => {
    const { data, error } = await supabase
      .from('promotions')
      .insert(promo)
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ promotions: [data, ...s.promotions] }));
    return data;
  },

  updatePromotion: async (id, updates) => {
    const { error } = await supabase
      .from('promotions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    set((s) => ({
      promotions: s.promotions.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  togglePromotion: async (id, isActive) => {
    await get().updatePromotion(id, { is_active: isActive });
  },

  subscribeToRealtime: (tenantId) => {
    const channelName = `plans-promos-${tenantId}`;

    // Supabase returns the same channel object for a given name, and throws if
    // you call .on() after .subscribe().  Remove any stale channel first.
    supabase.getChannels()
      .filter((ch) => ch.topic === `realtime:${channelName}`)
      .forEach((ch) => supabase.removeChannel(ch));

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'promotions',
        filter: `tenant_id=eq.${tenantId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const promo = payload.new as Promotion;
          if (promo.is_active) {
            set((s) => ({
              promotions: [promo, ...s.promotions],
              activePromotion: promo,
            }));
          }
        } else if (payload.eventType === 'UPDATE') {
          set((s) => ({
            promotions: s.promotions.map((p) =>
              p.id === payload.new.id ? { ...p, ...payload.new } : p
            ),
          }));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'plans',
        filter: `tenant_id=eq.${tenantId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          set((s) => ({ plans: [...s.plans, payload.new as Plan] }));
        } else if (payload.eventType === 'UPDATE') {
          set((s) => ({
            plans: s.plans.map((p) =>
              p.id === payload.new.id ? { ...p, ...payload.new } : p
            ),
          }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  dismissPromotion: () => set({ activePromotion: null }),
}));
