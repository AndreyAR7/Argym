import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Tenant } from '@/lib/types';

interface TenantState {
  tenant: Tenant | null;
  enabledModules: string[];
}

interface TenantActions {
  loadTenant: (tenantId: string) => Promise<void>;
  isModuleEnabled: (module: string) => boolean;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState & TenantActions>()((set, get) => ({
  tenant: null,
  enabledModules: [],

  loadTenant: async (tenantId) => {
    const [{ data: tenant }, { data: modules }] = await Promise.all([
      supabase.from('tenants').select('*').eq('id', tenantId).single(),
      supabase.from('tenant_modules').select('module').eq('tenant_id', tenantId).eq('enabled', true),
    ]);
    set({
      tenant: tenant as Tenant,
      enabledModules: (modules ?? []).map((m: any) => m.module),
    });
  },

  isModuleEnabled: (module) => get().enabledModules.includes(module),
  clearTenant: () => set({ tenant: null, enabledModules: [] }),
}));
