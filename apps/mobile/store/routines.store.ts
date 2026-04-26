import { create } from 'zustand';
import {
  fetchRoutinesAdmin, createRoutine, updateRoutine, deleteRoutine, toggleRoutineActive,
  addExercise, updateExercise, deleteExercise,
  assignRoutineToClient, removeRoutineAssignment,
  fetchClientRoutines, upsertExerciseProgress,
} from '@/services/routines.service';
import type { Routine, Exercise, ClientRoutine } from '@/types/routines';

interface RoutinesState {
  adminRoutines: Routine[];
  isLoadingAdmin: boolean;
  clientRoutines: ClientRoutine[];
  isLoadingClient: boolean;
  error: string | null;
}

interface RoutinesActions {
  // Admin
  loadAdminRoutines: (tenantId: string) => Promise<void>;
  addRoutine: (routine: Omit<Routine, 'id' | 'created_at' | 'updated_at' | 'exercises'>) => Promise<Routine>;
  editRoutine: (id: string, updates: Partial<Omit<Routine, 'exercises'>>) => Promise<void>;
  removeRoutine: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  // Exercises
  addExerciseToRoutine: (exercise: Omit<Exercise, 'id'>) => Promise<void>;
  editExercise: (id: string, updates: Partial<Exercise>) => Promise<void>;
  removeExercise: (routineId: string, exerciseId: string) => Promise<void>;
  // Assignments
  assignRoutine: (routineId: string, clientId: string, tenantId: string, assignedBy: string) => Promise<void>;
  unassignRoutine: (routineId: string, clientId: string) => Promise<void>;
  // Client
  loadClientRoutines: (clientId: string, tenantId: string, clientPlan?: string | null, clientLevel?: string | null) => Promise<void>;
  toggleExerciseDone: (routineId: string, exerciseId: string, clientId: string, tenantId: string, completed: boolean) => Promise<void>;
}

export const useRoutinesStore = create<RoutinesState & RoutinesActions>()((set, get) => ({
  adminRoutines: [],
  isLoadingAdmin: false,
  clientRoutines: [],
  isLoadingClient: false,
  error: null,

  loadAdminRoutines: async (tenantId) => {
    set({ isLoadingAdmin: true, error: null });
    try {
      const routines = await fetchRoutinesAdmin(tenantId);
      set({ adminRoutines: routines, isLoadingAdmin: false });
    } catch (e: any) { set({ isLoadingAdmin: false, error: e.message }); }
  },

  addRoutine: async (routine) => {
    const created = await createRoutine(routine);
    set((s) => ({ adminRoutines: [created, ...s.adminRoutines] }));
    return created;
  },

  editRoutine: async (id, updates) => {
    await updateRoutine(id, updates);
    set((s) => ({
      adminRoutines: s.adminRoutines.map((r) => r.id === id ? { ...r, ...updates } : r),
    }));
  },

  removeRoutine: async (id) => {
    await deleteRoutine(id);
    set((s) => ({ adminRoutines: s.adminRoutines.filter((r) => r.id !== id) }));
  },

  toggleActive: async (id, isActive) => {
    await toggleRoutineActive(id, isActive);
    set((s) => ({
      adminRoutines: s.adminRoutines.map((r) => r.id === id ? { ...r, is_active: isActive } : r),
    }));
  },

  addExerciseToRoutine: async (exercise) => {
    const created = await addExercise(exercise);
    set((s) => ({
      adminRoutines: s.adminRoutines.map((r) =>
        r.id === exercise.routine_id
          ? { ...r, exercises: [...(r.exercises ?? []), created] }
          : r
      ),
    }));
  },

  editExercise: async (id, updates) => {
    await updateExercise(id, updates);
    set((s) => ({
      adminRoutines: s.adminRoutines.map((r) => ({
        ...r,
        exercises: (r.exercises ?? []).map((e) => e.id === id ? { ...e, ...updates } : e),
      })),
    }));
  },

  removeExercise: async (routineId, exerciseId) => {
    await deleteExercise(exerciseId);
    set((s) => ({
      adminRoutines: s.adminRoutines.map((r) =>
        r.id === routineId
          ? { ...r, exercises: (r.exercises ?? []).filter((e) => e.id !== exerciseId) }
          : r
      ),
    }));
  },

  assignRoutine: async (routineId, clientId, tenantId, assignedBy) => {
    await assignRoutineToClient(routineId, clientId, tenantId, assignedBy);
    await get().loadAdminRoutines(tenantId);
  },

  unassignRoutine: async (routineId, clientId) => {
    await removeRoutineAssignment(routineId, clientId);
  },

  loadClientRoutines: async (clientId, tenantId, clientPlan, clientLevel) => {
    set({ isLoadingClient: true, error: null });
    try {
      const routines = await fetchClientRoutines(clientId, tenantId, clientPlan, clientLevel);
      set({ clientRoutines: routines, isLoadingClient: false });
    } catch (e: any) { set({ isLoadingClient: false, error: e.message }); }
  },

  toggleExerciseDone: async (routineId, exerciseId, clientId, tenantId, completed) => {
    await upsertExerciseProgress(routineId, exerciseId, clientId, tenantId, completed);
    // Optimistic update
    set((s) => ({
      clientRoutines: s.clientRoutines.map((r) => {
        if (r.id !== routineId) return r;
        const today = new Date().toISOString().split('T')[0];
        const existingIdx = r.progress.findIndex((p) => p.exercise_id === exerciseId);
        let newProgress = [...r.progress];
        if (existingIdx >= 0) {
          newProgress[existingIdx] = { ...newProgress[existingIdx], completed };
        } else {
          newProgress.push({
            id: `temp-${exerciseId}`,
            routine_id: routineId,
            exercise_id: exerciseId,
            client_id: clientId,
            tenant_id: tenantId,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            session_date: today,
          });
        }
        const completedCount = newProgress.filter((p) => p.completed).length;
        const totalCount = r.exercises?.length ?? 0;
        return {
          ...r,
          progress: newProgress,
          completedCount,
          progressPct: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        };
      }),
    }));
  },
}));
