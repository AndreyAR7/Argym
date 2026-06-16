import { create } from 'zustand';

interface SidebarStore {
  isOpen: boolean;
  reset: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>()((set) => ({
  isOpen: false,
  reset: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
