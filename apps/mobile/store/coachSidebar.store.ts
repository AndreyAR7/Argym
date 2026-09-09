import { create } from 'zustand';

interface CoachSidebarStore {
  isOpen: boolean;
  reset: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCoachSidebarStore = create<CoachSidebarStore>()((set) => ({
  isOpen: false,
  reset: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
