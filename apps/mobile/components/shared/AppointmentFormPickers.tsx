import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Appointment } from '@/types/appointments';
import {
  HOURS, MINUTES, DURATIONS, formatDateLabel, buildStartISO, buildEndISO,
  PREVIEW_DAY_START_HOUR, PREVIEW_TOTAL_MIN, PREVIEW_HOUR_MARKS, minutesSinceDayStart,
  computeSlotConflicts, type SlotConflictResult,
} from '@/lib/appointmentSlots';

export {
  HOURS, MINUTES, DURATIONS, formatDateLabel, buildStartISO, buildEndISO,
  computeSlotConflicts, type SlotConflictResult,
};

// ─── Date strip (14 days) ─────────────────────────────────────
export function DateStrip({ selected, onChange, T }: { selected: Date; onChange: (d: Date) => void; T: any }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      {days.map((d, i) => {
        const active = d.toDateString() === selected.toDateString();
        return (
          <TouchableOpacity key={i} onPress={() => onChange(d)}
            style={[styles.dayBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
            <Text style={{ fontSize: 10, color: active ? '#fff' : T.textMuted, fontWeight: '600' }}>
              {d.toLocaleDateString('es-CR', { weekday: 'short' }).toUpperCase()}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: active ? '#fff' : T.text }}>{d.getDate()}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Hour picker ──────────────────────────────────────────────
export function HourPicker({ hour, minute, onHour, onMinute, T }: {
  hour: string; minute: string; onHour: (h: string) => void; onMinute: (m: string) => void; T: any;
}) {
  return (
    <View style={{ gap: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {HOURS.map((h) => {
          const active = h === hour;
          return (
            <TouchableOpacity key={h} onPress={() => onHour(h)}
              style={[styles.timeBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : T.text }}>{h}h</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {MINUTES.map((m) => {
          const active = m === minute;
          return (
            <TouchableOpacity key={m} onPress={() => onMinute(m)}
              style={[styles.timeBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border, flex: 1 }]}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : T.text }}>:{m}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Duration picker ──────────────────────────────────────────
export function DurationPicker({ selected, onSelect, T }: { selected: number | null; onSelect: (m: number) => void; T: any }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {DURATIONS.map((d) => {
        const active = selected === d.minutes;
        return (
          <TouchableOpacity key={d.minutes} onPress={() => onSelect(d.minutes)}
            style={[styles.durationBtn, { backgroundColor: active ? T.accent : T.bgCardElevated, borderColor: active ? T.accent : T.border }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : T.text }}>{t(d.labelKey)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dayBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', marginRight: 6, minWidth: 48 },
  timeBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', marginRight: 6 },
  durationBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
});

// ─── Live slot preview + conflict detection ────────────────────
// Renders a compact same-day timeline inside the create form: existing
// appointments as tenue blocks, and a translucent "ghost" block showing
// exactly where the appointment being created would land — turning red
// the instant it overlaps an existing appointment for the selected
// client(s) or coach, using the same client, coach and time overlap
// rules as checkAppointmentConflicts (the authoritative check run again
// server-side on submit).
const PREVIEW_HEIGHT = 130;

export function DayPreviewStrip({
  appointments, date, startISO, endISO, hasConflicts, T, t,
}: {
  appointments: Appointment[];
  date: Date;
  startISO: string;
  endISO: string;
  hasConflicts: boolean;
  T: any;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const clampMin = (min: number) => Math.max(0, Math.min(PREVIEW_TOTAL_MIN, min));
  const previewTop = clampMin(minutesSinceDayStart(startISO));
  const previewBottom = clampMin(minutesSinceDayStart(endISO));
  const previewHeightMin = Math.max(previewBottom - previewTop, 14);

  const dayApts = appointments.filter((a) =>
    a.status !== 'cancelled' && new Date(a.start_time).toDateString() === date.toDateString()
  );

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{
        height: PREVIEW_HEIGHT, borderRadius: 12, borderWidth: 1, borderColor: T.border,
        backgroundColor: T.bg, overflow: 'hidden', position: 'relative',
      }}>
        {PREVIEW_HOUR_MARKS.map((h) => (
          <View key={h} style={{
            position: 'absolute', left: 0, right: 0,
            top: `${((h - PREVIEW_DAY_START_HOUR) * 60 / PREVIEW_TOTAL_MIN) * 100}%`,
            borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.border + '80',
          }}>
            <Text style={{ fontSize: 8, color: T.textMuted, marginLeft: 4 }}>{String(h).padStart(2, '0')}:00</Text>
          </View>
        ))}

        {dayApts.map((a) => {
          const top = clampMin(minutesSinceDayStart(a.start_time));
          const bottom = clampMin(minutesSinceDayStart(a.end_time));
          const h = Math.max(bottom - top, 10);
          return (
            <View key={a.id} style={{
              position: 'absolute', left: '6%', right: '6%',
              top: `${(top / PREVIEW_TOTAL_MIN) * 100}%`,
              height: `${(h / PREVIEW_TOTAL_MIN) * 100}%`,
              backgroundColor: T.textMuted + '33', borderRadius: 4,
            }} />
          );
        })}

        <View style={{
          position: 'absolute', left: '2%', right: '2%',
          top: `${(previewTop / PREVIEW_TOTAL_MIN) * 100}%`,
          height: `${(previewHeightMin / PREVIEW_TOTAL_MIN) * 100}%`,
          backgroundColor: (hasConflicts ? T.red : T.accent) + '40',
          borderWidth: 1.5, borderStyle: 'dashed',
          borderColor: hasConflicts ? T.red : T.accent,
          borderRadius: 6,
        }} />
      </View>
      <Text style={{ fontSize: 12, marginTop: 6, fontWeight: '700', color: hasConflicts ? T.red : T.green }}>
        {hasConflicts ? t('admin.appointments.form.slotConflict') : t('admin.appointments.form.slotAvailable')}
      </Text>
    </View>
  );
}
