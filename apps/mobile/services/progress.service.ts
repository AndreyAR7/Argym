import { supabase } from '@/lib/supabase';
import type { BodyMeasurement, DailyProgress, StreakData } from '@/types/progress';

export async function fetchBodyMeasurements(
  clientId: string,
  tenantId: string,
  limit = 30,
): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .order('measured_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as BodyMeasurement[];
}

export async function upsertBodyMeasurement(
  measurement: Omit<BodyMeasurement, 'id' | 'created_at'>,
): Promise<BodyMeasurement> {
  const { data, error } = await supabase
    .from('body_measurements')
    .upsert(measurement, { onConflict: 'client_id,measured_at' })
    .select()
    .single();
  if (error) throw error;
  return data as BodyMeasurement;
}

export async function deleteBodyMeasurement(id: string): Promise<void> {
  const { error } = await supabase.from('body_measurements').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDailyProgress(
  clientId: string,
  tenantId: string,
  days = 14,
): Promise<DailyProgress[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  const startStr = startDate.toISOString().split('T')[0];

  const { data } = await supabase
    .from('exercise_progress')
    .select('session_date, completed')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .gte('session_date', startStr);

  const byDate = new Map<string, { completed: number; total: number }>();
  for (const row of data ?? []) {
    const entry = byDate.get(row.session_date) ?? { completed: 0, total: 0 };
    entry.total++;
    if (row.completed) entry.completed++;
    byDate.set(row.session_date, entry);
  }

  const result: DailyProgress[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const entry = byDate.get(dateStr) ?? { completed: 0, total: 0 };
    result.push({
      date: dateStr,
      completedExercises: entry.completed,
      totalExercises: entry.total,
      pct: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
    });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

export async function fetchRoutineStreak(
  clientId: string,
  tenantId: string,
  lookbackDays = 90,
): Promise<StreakData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  const { data } = await supabase
    .from('exercise_progress')
    .select('session_date')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .eq('completed', true)
    .gte('session_date', startDate.toISOString().split('T')[0])
    .order('session_date', { ascending: true });

  // Unique dates in ascending order
  const activeDates = [...new Set((data ?? []).map((r) => r.session_date as string))];

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const activeSet = new Set(activeDates);

  // Current streak: backward from today (or yesterday if today inactive)
  let currentStreak = 0;
  const checkStart = activeSet.has(today) ? today : yesterdayStr;
  if (activeSet.has(checkStart)) {
    const d = new Date(checkStart);
    while (activeSet.has(d.toISOString().split('T')[0])) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    }
  }

  // Longest streak (sequential consecutive days)
  let longestStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < activeDates.length; i++) {
    if (i === 0) { tempStreak = 1; continue; }
    const prev = new Date(activeDates[i - 1]);
    const curr = new Date(activeDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    lastActiveDate: activeDates.length > 0 ? activeDates[activeDates.length - 1] : null,
    activeDates,
    type: 'routine',
  };
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Bajo peso', color: '#3b82f6' };
  if (bmi < 25) return { label: 'Normal', color: '#22c55e' };
  if (bmi < 30) return { label: 'Sobrepeso', color: '#f59e0b' };
  return { label: 'Obesidad', color: '#ef4444' };
}
