import { create } from 'zustand';
import * as GamificationService from '@/services/gamification.service';
import type {
  GameStats,
  LeaderboardEntry,
  UserBadge,
  BadgeDefinition,
  Challenge,
  CheckinResult,
  LevelDefinition,
} from '@/services/gamification.service';

// Re-export types so consumers can import from the store directly.
export type {
  GameStats,
  LeaderboardEntry,
  UserBadge,
  BadgeDefinition,
  Challenge,
  LevelDefinition,
};

// ─── State shape ──────────────────────────────────────────────

interface GamificationState {
  stats: GameStats | null;
  leaderboard: LeaderboardEntry[];
  leaderboardPeriod: 'week' | 'month' | 'all';
  myBadges: UserBadge[];
  allBadges: BadgeDefinition[];
  challenges: Challenge[];
  levelDefs: LevelDefinition[];
  isLoadingStats: boolean;
  isLoadingLeaderboard: boolean;
  isLoadingBadges: boolean;
  isLoadingChallenges: boolean;
  isCheckingIn: boolean;
  error: string | null;
}

// ─── Actions shape ────────────────────────────────────────────

interface GamificationActions {
  reset: () => void;
  fetchStats: (userId: string, tenantId: string) => Promise<void>;
  fetchLeaderboard: (tenantId: string, period?: 'week' | 'month' | 'all') => Promise<void>;
  fetchBadges: (userId: string, tenantId: string) => Promise<void>;
  fetchChallenges: (userId: string, tenantId: string) => Promise<void>;
  fetchLevelDefs: () => Promise<void>;
  performCheckin: (userId: string, tenantId: string, branchId?: string) => Promise<CheckinResult>;
  createChallenge: (params: Parameters<typeof GamificationService.createChallenge>[0]) => Promise<void>;
  respondToChallenge: (challengeId: string, userId: string, response: 'accepted' | 'declined') => Promise<void>;
  completeChallenge: (challengeId: string, userId: string) => Promise<{ xp_earned: number; badges_earned: BadgeDefinition[] }>;
  setLeaderboardPeriod: (period: 'week' | 'month' | 'all') => void;
}

// ─── Initial state ────────────────────────────────────────────

const initialState: GamificationState = {
  stats: null,
  leaderboard: [],
  leaderboardPeriod: 'week',
  myBadges: [],
  allBadges: [],
  challenges: [],
  levelDefs: [],
  isLoadingStats: false,
  isLoadingLeaderboard: false,
  isLoadingBadges: false,
  isLoadingChallenges: false,
  isCheckingIn: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────

export const useGamificationStore = create<GamificationState & GamificationActions>()(
  (set, get) => ({
    ...initialState,

    // Reset all state back to defaults (call on sign-out).
    reset: () => set(initialState),

    // ── Stats ──────────────────────────────────────────────────

    fetchStats: async (userId, tenantId) => {
      set({ isLoadingStats: true, error: null });
      try {
        const stats = await GamificationService.fetchGameStats(userId, tenantId);
        set({ stats, isLoadingStats: false });
      } catch (e: any) {
        set({ isLoadingStats: false, error: e.message ?? 'Error loading stats' });
      }
    },

    // ── Leaderboard ────────────────────────────────────────────

    fetchLeaderboard: async (tenantId, period) => {
      const resolvedPeriod = period ?? get().leaderboardPeriod;
      set({ isLoadingLeaderboard: true, error: null, leaderboardPeriod: resolvedPeriod });
      try {
        const leaderboard = await GamificationService.fetchLeaderboard(tenantId, resolvedPeriod);
        set({ leaderboard, isLoadingLeaderboard: false });
      } catch (e: any) {
        set({ isLoadingLeaderboard: false, error: e.message ?? 'Error loading leaderboard' });
      }
    },

    // ── Badges ─────────────────────────────────────────────────

    fetchBadges: async (userId, tenantId) => {
      set({ isLoadingBadges: true, error: null });
      try {
        const [myBadges, allBadges] = await Promise.all([
          GamificationService.fetchUserBadges(userId, tenantId),
          GamificationService.fetchAllBadges(),
        ]);
        set({ myBadges, allBadges, isLoadingBadges: false });
      } catch (e: any) {
        set({ isLoadingBadges: false, error: e.message ?? 'Error loading badges' });
      }
    },

    // ── Challenges ─────────────────────────────────────────────

    fetchChallenges: async (userId, tenantId) => {
      set({ isLoadingChallenges: true, error: null });
      try {
        const challenges = await GamificationService.fetchChallenges(userId, tenantId);
        set({ challenges, isLoadingChallenges: false });
      } catch (e: any) {
        set({ isLoadingChallenges: false, error: e.message ?? 'Error loading challenges' });
      }
    },

    // ── Level definitions ──────────────────────────────────────

    fetchLevelDefs: async () => {
      try {
        const levelDefs = await GamificationService.fetchLevelDefinitions();
        set({ levelDefs });
      } catch (e: any) {
        set({ error: e.message ?? 'Error loading level definitions' });
      }
    },

    // ── Check-in ───────────────────────────────────────────────

    performCheckin: async (userId, tenantId, branchId) => {
      set({ isCheckingIn: true, error: null });
      try {
        const result = await GamificationService.performCheckin(userId, tenantId, branchId);
        set({ isCheckingIn: false });

        // Refresh stats in the background so XP, streak, and level are up to date.
        get().fetchStats(userId, tenantId);

        // If the check-in unlocked badges, merge them into the local badge list
        // so the UI can react immediately without waiting for a full fetchBadges call.
        if (result.new_badges.length > 0) {
          const now = new Date().toISOString();
          const freshUserBadges: UserBadge[] = result.new_badges.map((badge) => ({
            id: `${userId}-${badge.id}`,
            badge_id: badge.id,
            earned_at: now,
            badge,
          }));
          set((s) => ({
            myBadges: [...freshUserBadges, ...s.myBadges],
          }));
        }

        return result;
      } catch (e: any) {
        set({ isCheckingIn: false, error: e.message ?? 'Error performing check-in' });
        throw e;
      }
    },

    // ── Create challenge ───────────────────────────────────────

    createChallenge: async (params) => {
      set({ error: null });
      try {
        await GamificationService.createChallenge(params);

        // Determine the userId from the params so we can refresh the list.
        // The service inserts with creator_id coming from the RLS-resolved auth.uid(),
        // but we need userId + tenantId to re-fetch. They are available inside params.
        // We refresh with the tenantId from params; userId is not in params so we read
        // the existing challenges list to derive it, or skip the auto-fetch when absent.
        //
        // The recommended pattern is for the caller to pass both userId and tenantId
        // when invoking createChallenge, but to keep the API surface minimal we trigger
        // a best-effort refresh using only tenantId. The userId-scoped refresh is the
        // caller's responsibility when needed.
        const existingChallenge = get().challenges[0];
        if (existingChallenge) {
          // Re-fetch using the first challenge's creator_id as a proxy for the current user.
          // In practice the caller should call fetchChallenges(userId, tenantId) explicitly
          // after this action when it needs a guaranteed refresh.
          await GamificationService.fetchChallenges(existingChallenge.creator_id, params.tenantId)
            .then((challenges) => set({ challenges }))
            .catch(() => {
              // Non-fatal: the challenge was created successfully.
            });
        }
      } catch (e: any) {
        set({ error: e.message ?? 'Error creating challenge' });
        throw e;
      }
    },

    // ── Respond to challenge ───────────────────────────────────

    respondToChallenge: async (challengeId, userId, response) => {
      set({ error: null });
      try {
        await GamificationService.respondToChallenge(challengeId, userId, response);

        // Update the local challenge list optimistically so the UI reflects the
        // new status without a round-trip.
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === challengeId ? { ...c, my_status: response } : c,
          ),
        }));
      } catch (e: any) {
        set({ error: e.message ?? 'Error responding to challenge' });
        throw e;
      }
    },

    // ── Complete challenge ─────────────────────────────────────

    completeChallenge: async (challengeId, userId) => {
      set({ error: null });
      try {
        const result = await GamificationService.completeChallenge(challengeId, userId);

        // Mark the challenge as completed locally.
        set((s) => ({
          challenges: s.challenges.map((c) =>
            c.id === challengeId ? { ...c, my_status: 'completed' } : c,
          ),
        }));

        // Merge any newly unlocked badges into the local list.
        if (result.badges_earned.length > 0) {
          const now = new Date().toISOString();
          const freshUserBadges: UserBadge[] = result.badges_earned.map((badge) => ({
            id: `${userId}-${badge.id}`,
            badge_id: badge.id,
            earned_at: now,
            badge,
          }));
          set((s) => ({
            myBadges: [...freshUserBadges, ...s.myBadges],
          }));
        }

        return result;
      } catch (e: any) {
        set({ error: e.message ?? 'Error completing challenge' });
        throw e;
      }
    },

    // ── Leaderboard period helper ──────────────────────────────

    setLeaderboardPeriod: (period) => {
      set({ leaderboardPeriod: period });
    },
  }),
);
