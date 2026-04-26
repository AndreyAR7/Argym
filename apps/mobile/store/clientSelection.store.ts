/**
 * Minimal store to pass client selection between screens.
 * appointments.tsx writes the initial selection and reads the result.
 * select-clients.tsx reads and writes the selection.
 */
import { create } from 'zustand';

export interface SelectedClient {
  id: string;
  full_name: string;
}

interface ClientSelectionStore {
  selected: SelectedClient[];
  tenantId: string;
  setTenantId: (id: string) => void;
  setSelected: (clients: SelectedClient[]) => void;
  toggle: (client: SelectedClient) => void;
  clear: () => void;
}

export const useClientSelectionStore = create<ClientSelectionStore>()((set, get) => ({
  selected: [],
  tenantId: '',
  setTenantId: (id) => set({ tenantId: id }),
  setSelected: (clients) => set({ selected: clients }),
  toggle: (client) => {
    const prev = get().selected;
    const exists = prev.some((c) => c.id === client.id);
    set({ selected: exists ? prev.filter((c) => c.id !== client.id) : [...prev, client] });
  },
  clear: () => set({ selected: [] }),
}));
