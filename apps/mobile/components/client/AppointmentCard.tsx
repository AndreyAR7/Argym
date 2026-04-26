import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  appointment: {
    title: string;
    coach_name?: string;
    start_time: string;
    location?: string;
    meeting_url?: string;
    notes?: string;
    appointment_type: 'in_person' | 'virtual';
    status?: string;
  };
  onPress?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#F59E0B',
  confirmed: '#10B981',
  completed: '#3B82F6',
  cancelled: '#EF4444',
  no_show: '#6B7280',
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  const day = isToday ? 'Hoy' : isTomorrow ? 'Mañana' : d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' });
  return { day, time };
}

export function AppointmentCard({ appointment, onPress }: Props) {
  const T = useTheme();
  const { day, time } = formatTime(appointment.start_time);
  const isVirtual = appointment.appointment_type === 'virtual';
  const status = appointment.status ?? 'scheduled';
  const statusColor = STATUS_COLOR[status] ?? '#6B7280';
  const statusLabel = STATUS_LABEL[status] ?? status;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, ...T.shadowCard }]}>
      <View style={[styles.accentBar, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={[styles.timeText, { color: T.textMuted }]}>{day} · {time}</Text>
        </View>
        <View style={styles.typeRow}>
          <View style={[styles.typeBadge, { backgroundColor: isVirtual ? T.blueSoft : T.greenSoft }]}>
            <Text style={[styles.typeBadgeText, { color: isVirtual ? T.blue : T.green }]}>
              {isVirtual ? '📹 Virtual' : '🏋️ Presencial'}
            </Text>
          </View>
        </View>
        <Text style={[styles.title, { color: T.text }]}>{appointment.title}</Text>
        {appointment.coach_name && (
          <Text style={[styles.coach, { color: T.textSecondary }]}>con {appointment.coach_name}</Text>
        )}
        {appointment.appointment_type === 'in_person' && appointment.location && (
          <Text style={[styles.location, { color: T.textMuted }]}>📍 {appointment.location}</Text>
        )}
        {appointment.appointment_type === 'virtual' && appointment.meeting_url && (
          <Text style={[styles.location, { color: T.blue }]}>🔗 Unirse a la reunión</Text>
        )}
        {appointment.notes && (
          <Text style={[styles.notes, { color: T.textMuted }]}>{appointment.notes}</Text>
        )}
      </View>
      <View style={styles.arrow}>
        <Text style={{ color: T.textMuted, fontSize: 18 }}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1 },
  accentBar: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  typeRow: { marginBottom: 6 },
  typeBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  timeText: { fontSize: 12, fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  coach: { fontSize: 13, marginBottom: 4 },
  location: { fontSize: 12 },
  notes: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  arrow: { paddingRight: 14 },
});
