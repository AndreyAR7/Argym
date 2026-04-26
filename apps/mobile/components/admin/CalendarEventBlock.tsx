import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import type { Appointment } from '@/types/appointments';

// px per minute — 1 hour = 80px (more spacious, better readability)
export const PX_PER_MIN = 80 / 60;

// Softer, dark-mode-friendly status colors
export const STATUS_COLORS: Record<string, string> = {
  scheduled: '#4F8EF7',   // soft blue
  confirmed: '#34C78A',   // soft green
  completed: '#8A8FA8',   // muted slate
  cancelled: '#F26B6B',   // soft red
  no_show:   '#E8A838',   // amber
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show:   'No asistió',
};

interface Props {
  apt: Appointment;
  dayStartHour: number;
  columnWidth: number;
  columnLeft: number;
  onPress: () => void;
}

export function CalendarEventBlock({ apt, dayStartHour, columnWidth, columnLeft, onPress }: Props) {
  const start = new Date(apt.start_time);
  const end = new Date(apt.end_time);

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const dayStartMinutes = dayStartHour * 60;

  const top = (startMinutes - dayStartMinutes) * PX_PER_MIN;
  const durationMin = endMinutes - startMinutes;
  const height = Math.max(durationMin * PX_PER_MIN, 32);

  const color = STATUS_COLORS[apt.status] ?? STATUS_COLORS.scheduled;
  const isVirtual = apt.appointment_type === 'virtual';
  const startTime = start.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });

  // Decide what to show based on available height
  const showCoach = height >= 72 && !!apt.coach_name;
  const showClient = height >= 52 && !!apt.client_name;
  const showTimeRange = height >= 44;
  const showType = height >= 60;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.block,
        {
          top,
          height,
          left: columnLeft + 3,
          width: columnWidth - 6,
          backgroundColor: color + 'E8',
          borderLeftColor: color,
          shadowColor: color,
        },
      ]}
    >
      {/* Time row */}
      <View style={styles.timeRow}>
        <Text style={styles.timeText} numberOfLines={1}>
          {showTimeRange ? `${startTime} – ${endTime}` : startTime}
        </Text>
        {showType && (
          <Text style={styles.typeEmoji}>{isVirtual ? '📹' : '🏋️'}</Text>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={height < 52 ? 1 : 2}>{apt.title}</Text>

      {/* Client */}
      {showClient && apt.client_name && (
        <Text style={styles.meta} numberOfLines={1}>👤 {apt.client_name}</Text>
      )}

      {/* Coach */}
      {showCoach && apt.coach_name && (
        <Text style={styles.meta} numberOfLines={1}>🏅 {apt.coach_name}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    borderRadius: 7,
    borderLeftWidth: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timeText: { fontSize: 10, color: '#fff', fontWeight: '700', opacity: 0.92, flex: 1 },
  typeEmoji: { fontSize: 10 },
  title: { fontSize: 12, color: '#fff', fontWeight: '800', lineHeight: 15 },
  meta: { fontSize: 10, color: '#ffffffDD', marginTop: 1 },
});
