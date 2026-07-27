import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-user, on-device flag for whether the first-run feature tour has been
// shown. Keyed by user id (not just a single global flag) so a second
// account signing in on the same device still gets its own tour once.
const STORAGE_PREFIX = 'onboarding_seen_v1:';

interface OnboardingState {
  seenByUser: Record<string, boolean>;
  checkedByUser: Record<string, boolean>;
  checkSeen: (userId: string) => Promise<void>;
  markSeen: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  seenByUser: {},
  checkedByUser: {},

  checkSeen: async (userId: string) => {
    if (get().checkedByUser[userId]) return;
    let seen = false;
    try {
      seen = (await AsyncStorage.getItem(STORAGE_PREFIX + userId)) === '1';
    } catch (err) {
      // Defaulting to "seen" here would make a storage read failure
      // silently and permanently hide the tour with no visible error —
      // exactly the failure mode that isn't worth risking. Showing the
      // tour again to someone who already saw it is a far smaller cost.
      console.warn('[onboarding] failed to read seen-flag, showing tour:', err);
      seen = false;
    }
    set((s) => ({
      seenByUser: { ...s.seenByUser, [userId]: seen },
      checkedByUser: { ...s.checkedByUser, [userId]: true },
    }));
  },

  markSeen: async (userId: string) => {
    set((s) => ({ seenByUser: { ...s.seenByUser, [userId]: true } }));
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + userId, '1');
    } catch {
      // In-memory flag above already prevents re-showing the tour this
      // session even if the write itself fails.
    }
  },

  // Only clears the in-memory cache — the persisted per-user flag on disk
  // is intentionally kept so the same account doesn't see the tour again
  // after signing back in on the same device.
  reset: () => set({ seenByUser: {}, checkedByUser: {} }),
}));
