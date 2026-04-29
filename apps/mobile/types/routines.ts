export type RoutineLevel = 'beginner' | 'intermediate' | 'advanced';
export type RoutinePlan = 'basic' | 'medium' | 'premium';
export type ExerciseMuscle =
  | 'Pecho' | 'Espalda' | 'Hombros' | 'Bíceps' | 'Tríceps'
  | 'Piernas' | 'Glúteos' | 'Core' | 'Cardio' | 'General';

export interface Exercise {
  id: string;
  routine_id: string;
  tenant_id: string;
  name: string;
  muscle: ExerciseMuscle;
  sets: number;
  reps: number;
  rest_seconds: number;
  notes: string | null;
  sort_order: number;
  demo_video_storage_path: string | null;
  demo_video_bucket: string | null;
  demo_video_mime_type: string | null;
  demo_duration_seconds: number | null;
}

export interface Routine {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  level: RoutineLevel;
  allowed_plans: RoutinePlan[];
  allowed_levels: RoutineLevel[];
  is_active: boolean;
  is_template: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  exercises?: Exercise[];
}

export interface RoutineAssignment {
  id: string;
  routine_id: string;
  client_id: string;
  tenant_id: string;
  assigned_by: string;
  assigned_at: string;
  routine?: Routine;
}

export interface ExerciseProgress {
  id: string;
  routine_id: string;
  exercise_id: string;
  client_id: string;
  tenant_id: string;
  completed: boolean;
  completed_at: string | null;
  session_date: string;
}

// Client-enriched routine
export interface ClientRoutine extends Routine {
  progress: ExerciseProgress[];
  completedCount: number;
  totalCount: number;
  progressPct: number;
}

export const ROUTINE_LEVEL_LABELS: Record<RoutineLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export const ROUTINE_PLAN_LABELS: Record<RoutinePlan, string> = {
  basic: 'Básico',
  medium: 'Medio',
  premium: 'Premium',
};

export const ROUTINE_PLAN_OPTIONS: RoutinePlan[] = ['basic', 'medium', 'premium'];
export const ROUTINE_LEVEL_OPTIONS: RoutineLevel[] = ['beginner', 'intermediate', 'advanced'];

export const MUSCLE_OPTIONS: ExerciseMuscle[] = [
  'Pecho','Espalda','Hombros','Bíceps','Tríceps',
  'Piernas','Glúteos','Core','Cardio','General',
];
