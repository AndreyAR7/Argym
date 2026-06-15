import { create } from 'zustand';
import {
  fetchNutritionPlansAdmin,
  createNutritionPlan,
  updateNutritionPlan,
  deleteNutritionPlan,
  setNutritionStatus,
  assignNutritionPlan,
  removeNutritionAssignment,
} from '@/services/nutrition.service';
import type { NutritionPlan, NutritionStatus } from '@/types/nutrition';

interface NutritionState {
  adminPlans: NutritionPlan[];
  isLoading: boolean;
  error: string | null;
}

interface NutritionActions {
  reset: () => void;
  loadAdminPlans: (tenantId: string) => Promise<void>;
  addPlan: (plan: Omit<NutritionPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<NutritionPlan>;
  editPlan: (id: string, updates: Partial<Omit<NutritionPlan, 'id' | 'tenant_id' | 'created_at'>>) => Promise<void>;
  removePlan: (id: string) => Promise<void>;
  changePlanStatus: (id: string, status: NutritionStatus) => Promise<void>;
  assignPlan: (planId: string, clientId: string, tenantId: string, assignedBy: string, note?: string) => Promise<void>;
  unassignPlan: (planId: string, clientId: string) => Promise<void>;
}

const initialState: NutritionState = {
  adminPlans: [],
  isLoading: false,
  error: null,
};

export const useNutritionStore = create<NutritionState & NutritionActions>()((set, get) => ({
  ...initialState,

  reset: () => set(initialState),

  loadAdminPlans: async (tenantId) => {
    set({ isLoading: true, error: null });
    try {
      const plans = await fetchNutritionPlansAdmin(tenantId);
      set({ adminPlans: plans, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  addPlan: async (plan) => {
    const created = await createNutritionPlan(plan);
    set((s) => ({ adminPlans: [created, ...s.adminPlans] }));
    return created;
  },

  editPlan: async (id, updates) => {
    await updateNutritionPlan(id, updates);
    set((s) => ({
      adminPlans: s.adminPlans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  removePlan: async (id) => {
    await deleteNutritionPlan(id);
    set((s) => ({ adminPlans: s.adminPlans.filter((p) => p.id !== id) }));
  },

  changePlanStatus: async (id, status) => {
    await setNutritionStatus(id, status);
    set((s) => ({
      adminPlans: s.adminPlans.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  },

  assignPlan: async (planId, clientId, tenantId, assignedBy, note) => {
    await assignNutritionPlan(planId, clientId, tenantId, assignedBy, note);
  },

  unassignPlan: async (planId, clientId) => {
    await removeNutritionAssignment(planId, clientId);
  },
}));
