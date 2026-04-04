import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const T = useTheme();

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active:       { label: 'Activo',       color: T.green },
    inactive:     { label: 'Inactivo',     color: T.textMuted },
    scheduled:    { label: 'Programada',   color: T.accent },
    confirmed:    { label: 'Confirmada',   color: T.green },
    completed:    { label: 'Completada',   color: T.teal },
    cancelled:    { label: 'Cancelada',    color: T.red },
    pending:      { label: 'Pendiente',    color: T.orange },
    no_show:      { label: 'No asistió',   color: T.red },
    beginner:     { label: 'Principiante', color: T.green },
    intermediate: { label: 'Intermedio',   color: T.accent },
    advanced:     { label: 'Avanzado',     color: T.red },
  };

  const cfg = STATUS_CONFIG[status] ?? { label: status, color: T.textMuted };
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '20' }]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.text, { color: cfg.color, fontSize: isSmall ? 10 : 11 }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontWeight: '700' },
});
