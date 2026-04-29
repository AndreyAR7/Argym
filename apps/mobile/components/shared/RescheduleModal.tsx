import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { createAppointment } from '@/services/appointments.service';
import { APPOINTMENTS_KEYS } from '@/hooks/useAppointments';
import type { Appointment } from '@/types/appointments';

const HOURS = Array.from({ length: 15 }, (_, i) => String(i + 6).padStart(2, '0')); // 06-20
const MINUTES = ['00', '15', '30', '45'];
const DURATIONS = [
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hora', minutes: 60 },
  { label: '1h 30', minutes: 90 },
  { label: '2 horas', minutes: 120 },
  { label: '3 horas', minutes: 180 },
];

function origDuration(apt: Appointment): number {
  const diff = new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime();
  const mins = Math.round(diff / 60000);
  return DURATIONS.reduce((p, c) => Math.abs(c.minutes - mins) < Math.abs(p.minutes - mins) ? c : p).minutes;
}

function buildISO(date: Date, hour: string, minute: string): string {
  const d = new Date(date);
  d.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
  return d.toISOString();
}

interface Props {
  visible: boolean;
  onClose: () => void;
  appointment: Appointment;
  tenantId: string;
  /** The ID to use for query invalidation (tenantId for admin, userId for client) */
  invalidateId: string;
  invalidateType: 'tenant' | 'client';
  onSuccess?: () => void;
}

export function RescheduleModal({ visible, onClose, appointment, tenantId, invalidateId, invalidateType, onSuccess }: Props) {
  const T = useTheme();
  const qc = useQueryClient();

  // Build a 30-day forward strip starting from tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const futureDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(tomorrow);
    d.setDate(tomorrow.getDate() + i);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState<Date>(futureDays[0]);
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [duration, setDuration] = useState(() => origDuration(appointment));
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const startISO = buildISO(selectedDate, hour, minute);
      const endDate = new Date(startISO);
      endDate.setMinutes(endDate.getMinutes() + duration);
      const endISO = endDate.toISOString();

      await createAppointment({
        tenant_id: tenantId,
        client_id: appointment.client_id,
        coach_id: appointment.coach_id ?? undefined,
        title: appointment.title,
        description: appointment.description ?? undefined,
        start_time: startISO,
        end_time: endISO,
        appointment_type: appointment.appointment_type ?? 'in_person',
        location: appointment.location ?? undefined,
        meeting_url: appointment.meeting_url ?? undefined,
        notes: appointment.notes ?? undefined,
        group_mode: appointment.group_mode ?? 'individual',
      });

      if (invalidateType === 'tenant') {
        qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.tenant(invalidateId) });
      } else {
        qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.client(invalidateId) });
      }

      onSuccess?.();
      onClose();
    } catch (e: any) {
      // show error inline
      console.error('[RescheduleModal]', e);
    } finally {
      setLoading(false);
    }
  };

  const apt = appointment;
  const typeLabel = apt.appointment_type === 'virtual' ? '📹 Virtual' : '🏋️ Presencial';
  const formattedDate = selectedDate.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.root, { backgroundColor: T.bg }]}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={[s.closeText, { color: T.textMuted }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: T.text }]}>Reagendar Cita</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {/* Original info */}
          <View style={[s.infoCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={[s.infoTitle, { color: T.text }]}>{apt.title}</Text>
            <Text style={[s.infoMeta, { color: T.textMuted }]}>{typeLabel}</Text>
            {apt.coach_name && <Text style={[s.infoMeta, { color: T.textMuted }]}>con {apt.coach_name}</Text>}
            <View style={[s.cancelledBadge, { backgroundColor: '#EF444422' }]}>
              <Text style={[s.cancelledText, { color: '#EF4444' }]}>Cancelada — se creará una nueva cita</Text>
            </View>
          </View>

          {/* Date selector */}
          <Text style={[s.sectionLabel, { color: T.textMuted }]}>NUEVA FECHA</Text>
          <Text style={[s.dateDisplay, { color: T.text }]}>{formattedDate}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {futureDays.map((d, i) => {
              const active = d.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity key={i} onPress={() => setSelectedDate(d)}
                  style={[s.dayBtn, { backgroundColor: active ? T.accent : T.bgCard, borderColor: active ? T.accent : T.border }]}>
                  <Text style={{ fontSize: 9, color: active ? '#fff' : T.textMuted, fontWeight: '600' }}>
                    {d.toLocaleDateString('es-CR', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: active ? '#fff' : T.text }}>{d.getDate()}</Text>
                  <Text style={{ fontSize: 9, color: active ? '#ffffffaa' : T.textMuted }}>
                    {d.toLocaleDateString('es-CR', { month: 'short' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Hour picker */}
          <Text style={[s.sectionLabel, { color: T.textMuted }]}>HORA DE INICIO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {HOURS.map((h) => {
              const active = h === hour;
              return (
                <TouchableOpacity key={h} onPress={() => setHour(h)}
                  style={[s.timeBtn, { backgroundColor: active ? T.accent : T.bgCard, borderColor: active ? T.accent : T.border }]}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : T.text }}>{h}h</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {MINUTES.map((m) => {
              const active = m === minute;
              return (
                <TouchableOpacity key={m} onPress={() => setMinute(m)}
                  style={[s.timeBtn, { flex: 1, backgroundColor: active ? T.accent : T.bgCard, borderColor: active ? T.accent : T.border }]}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : T.text }}>:{m}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Duration picker */}
          <Text style={[s.sectionLabel, { color: T.textMuted }]}>DURACIÓN</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {DURATIONS.map((d) => {
              const active = duration === d.minutes;
              return (
                <TouchableOpacity key={d.minutes} onPress={() => setDuration(d.minutes)}
                  style={[s.durBtn, { backgroundColor: active ? T.accent : T.bgCard, borderColor: active ? T.accent : T.border }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : T.text }}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Summary */}
          <View style={[s.summaryCard, { backgroundColor: T.accentGlow ?? T.bgCard, borderColor: T.accent }]}>
            <Text style={[s.summaryTitle, { color: T.accent }]}>Nueva cita</Text>
            <Text style={[s.summaryLine, { color: T.text }]}>
              {formattedDate} a las {hour}:{minute}
            </Text>
            <Text style={[s.summaryLine, { color: T.textMuted }]}>
              Duración: {DURATIONS.find((d) => d.minutes === duration)?.label ?? `${duration} min`}
            </Text>
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={loading}
            style={[s.confirmBtn, { backgroundColor: loading ? T.accent + '88' : T.accent }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.confirmText}>Confirmar Reagendamiento</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 48 },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  infoMeta: { fontSize: 13, marginBottom: 2 },
  cancelledBadge: { marginTop: 8, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  cancelledText: { fontSize: 11, fontWeight: '700' },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  dateDisplay: { fontSize: 15, fontWeight: '600', marginBottom: 10, textTransform: 'capitalize' },
  dayBtn: { width: 52, height: 64, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 8, gap: 2 },
  timeBtn: { minWidth: 44, height: 40, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, marginRight: 8 },
  durBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  summaryCard: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 20 },
  summaryTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryLine: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  confirmBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
