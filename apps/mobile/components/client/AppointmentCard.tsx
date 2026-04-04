import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  appointment: {
    title: string;
    coach_name: string;
    start_time: string;
    location?: string;
    appointment_type: 'in_person' | 'virtual';
  };
  onPress?: () => void;
}

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

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, ...T.shadowCard }]}>
      <View style={[styles.accentBar, { backgroundColor: isVirtual ? T.blue : T.green }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.typeBadge, { backgroundColor: isVirtual ? T.blueSoft : T.greenSoft }]}>
            <Text style={[styles.typeBadgeText, { color: isVirtual ? T.blue : T.green }]}>
              {isVirtual ? '📹 Virtual' : '🏋️ Presencial'}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: T.textMuted }]}>{day} · {time}</Text>
        </View>
        <Text style={[styles.title, { color: T.text }]}>{appointment.title}</Text>
        <Text style={[styles.coach, { color: T.textSecondary }]}>con {appointment.coach_name}</Text>
        {appointment.location && <Text style={[styles.location, { color: T.textMuted }]}>📍 {appointment.location}</Text>}
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
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  timeText: { fontSize: 12, fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  coach: { fontSize: 13, marginBottom: 4 },
  location: { fontSize: 12 },
  arrow: { paddingRight: 14 },
});
