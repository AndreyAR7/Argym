import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;
  accent?: string;
  icon?: string;
}

export function StatCard({ label, value, unit, change, accent, icon }: Props) {
  const T = useTheme();
  const resolvedAccent = accent ?? T.accent;
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <View style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, ...T.shadowCard }]}>
      <View style={[styles.iconBg, { backgroundColor: resolvedAccent + '22' }]}>
        <Text style={{ fontSize: 18 }}>{icon ?? '📊'}</Text>
      </View>
      <Text style={[styles.label, { color: T.textMuted }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: resolvedAccent }]}>{value}</Text>
        {unit && <Text style={[styles.unit, { color: T.textSecondary }]}>{unit}</Text>}
      </View>
      {change !== undefined && (
        <Text style={[styles.change, { color: isNegative ? T.green : isPositive ? T.orange : T.textMuted }]}>
          {change > 0 ? '+' : ''}{change} {unit}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, flex: 1 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '500', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  value: { fontSize: 22, fontWeight: '800' },
  unit: { fontSize: 12, fontWeight: '500' },
  change: { fontSize: 12, fontWeight: '600', marginTop: 4 },
});
