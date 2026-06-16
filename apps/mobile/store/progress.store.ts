import { create } from 'zustand';
import type { BodyMeasurement, DailyProgress, StreakData } from '@/types/progress';
import {
  fetchBodyMeasurements,
  upsertBodyMeasurement,
  deleteBodyMeasurement,
  fetchDailyProgress,
  fetchRoutineStreak,
  getThisWeekMeasurement,
} from '@/services/progress.service';

interface ProgressState {
  measurements: BodyMeasurement[];
  thisWeekMeasurement: BodyMeasurement | null;
  dailyProgress: DailyProgress[];
  routineStreak: StreakData | null;
  isLoading: boolean;
  error: string | null;
}

interface ProgressActions {
  reset: () => void;
  loadAll: (clientId: string, tenantId: string) => Promise<void>;
  addMeasurement: (m: Omit<BodyMeasurement, 'id' | 'created_at'>) => Promise<void>;
  removeMeasurement: (id: string) => Promise<void>;
}

export const useProgressStore = create<ProgressState & ProgressActions>()((set) => ({
  measurements: [],
  thisWeekMeasurement: null,
  dailyProgress: [],
  routineStreak: null,
  isLoading: false,
  error: null,

  reset: () => set({ measurements: [], thisWeekMeasurement: null, dailyProgress: [], routineStreak: null, isLoading: false, error: null }),

  loadAll: async (clientId, tenantId) => {
    set({ isLoading: true, error: null });
    try {
      const [measurements, dailyProgress, routineStreak, thisWeekMeasurement] = await Promise.all([
        fetchBodyMeasurements(clientId, tenantId),
        fetchDailyProgress(clientId, tenantId, 14),
        fetchRoutineStreak(clientId, tenantId),
        getThisWeekMeasurement(clientId, tenantId),
      ]);
      set({ measurements, dailyProgress, routineStreak, thisWeekMeasurement, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  addMeasurement: async (m) => {
    const data = await upsertBodyMeasurement(m);
    set((s) => {
      const updated = [data, ...s.measurements.filter((x) => x.measured_at !== data.measured_at)]
        .sort((a, b) => b.measured_at.localeCompare(a.measured_at));
      return {
        measurements: updated,
        thisWeekMeasurement: data,
      };
    });
  },

  removeMeasurement: async (id) => {
    await deleteBodyMeasurement(id);
    set((s) => ({ measurements: s.measurements.filter((m) => m.id !== id) }));
  },
}));
