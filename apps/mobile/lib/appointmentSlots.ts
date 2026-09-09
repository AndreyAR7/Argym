// Pure appointment date/conflict logic — deliberately free of any
// react-native import so it can be unit-tested without the RN bridge
// (StyleSheet/View pull in the native module registry, which jest-expo
// only initializes for actual component tests).
import type { Appointment } from '@/types/appointments';

export const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
export const MINUTES = ['00', '15', '30', '45'];
export const DURATIONS = [
  { labelKey: 'admin.appointments.durations.min30', minutes: 30 },
  { labelKey: 'admin.appointments.durations.min45', minutes: 45 },
  { labelKey: 'admin.appointments.durations.hour1', minutes: 60 },
  { labelKey: 'admin.appointments.durations.hour1_30', minutes: 90 },
  { labelKey: 'admin.appointments.durations.hour2', minutes: 120 },
  { labelKey: 'admin.appointments.durations.hour3', minutes: 180 },
  { labelKey: 'admin.appointments.durations.hour4', minutes: 240 },
  { labelKey: 'admin.appointments.durations.hour5', minutes: 300 },
];

export function formatDateLabel(d: Date) {
  return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function buildStartISO(date: Date, hour: string, minute: string) {
  const d = new Date(date);
  d.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
  return d.toISOString();
}

export function buildEndISO(startISO: string, durationMinutes: number) {
  const d = new Date(startISO);
  d.setMinutes(d.getMinutes() + durationMinutes);
  return d.toISOString();
}

export const PREVIEW_DAY_START_HOUR = 6;
export const PREVIEW_DAY_END_HOUR = 22;
export const PREVIEW_TOTAL_MIN = (PREVIEW_DAY_END_HOUR - PREVIEW_DAY_START_HOUR) * 60;
export const PREVIEW_HOUR_MARKS = [6, 10, 14, 18, 22];

export function minutesSinceDayStart(iso: string) {
  const d = new Date(iso);
  return (d.getHours() - PREVIEW_DAY_START_HOUR) * 60 + d.getMinutes();
}

export interface SlotConflictResult {
  hasConflicts: boolean;
  conflictTitles: string[];
}

export function computeSlotConflicts(
  appointments: Appointment[],
  startISO: string,
  endISO: string,
  clientIds: string[],
  coachId: string | null | undefined
): SlotConflictResult {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  const overlapping = appointments.filter((a) => {
    if (a.status === 'cancelled') return false;
    const aStart = new Date(a.start_time).getTime();
    const aEnd = new Date(a.end_time).getTime();
    return s < aEnd && e > aStart;
  });
  const conflicts = overlapping.filter((a) =>
    (!!coachId && a.coach_id === coachId) || clientIds.includes(a.client_id)
  );
  return { hasConflicts: conflicts.length > 0, conflictTitles: conflicts.map((a) => a.title) };
}
