import { create } from 'zustand';

interface ClientSidebarStore {
  isOpen: boolean;
  reset: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useClientSidebarStore = create<ClientSidebarStore>()((set) => ({
  isOpen: false,
  reset: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
