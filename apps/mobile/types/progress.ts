export type Gender = 'male' | 'female' | 'other';

export interface BodyMeasurement {
  id: string;
  client_id: string;
  tenant_id: string;
  measured_at: string; // ISO date string YYYY-MM-DD
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  neck_cm: number | null;
  shoulder_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  abdomen_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
  notes: string | null;
  created_at: string;
}

export interface DailyProgress {
  date: string;
  completedExercises: number;
  totalExercises: number;
  pct: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  activeDates: string[]; // ascending chronological ISO dates
  type: 'routine' | 'measurement';
}
