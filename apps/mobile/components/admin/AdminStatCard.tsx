import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  accent?: string;
  trend?: { value: number; label: string };
  onPress?: () => void;
}

export function AdminStatCard({ label, value, sub, icon, accent, trend, onPress }: Props) {
  const T = useTheme();
  const resolvedAccent = accent ?? T.accent;
  const isPositive = trend && trend.value > 0;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.8 : 1}
      style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, borderLeftColor: resolvedAccent, ...T.shadowCard }]}>
      <View style={styles.top}>
        <View style={[styles.iconBg, { backgroundColor: resolvedAccent + '20' }]}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        {trend && (
          <View style={[styles.trend, { backgroundColor: isPositive ? T.greenSoft : T.redSoft }]}>
            <Text style={[styles.trendText, { color: isPositive ? T.green : T.red }]}>
              {isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: resolvedAccent }]}>{value}</Text>
      <Text style={[styles.label, { color: T.textMuted }]}>{label}</Text>
      {sub && <Text style={[styles.sub, { color: T.textSecondary }]}>{sub}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderLeftWidth: 3, padding: 14, flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  trend: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  trendText: { fontSize: 10, fontWeight: '700' },
  value: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sub: { fontSize: 11, marginTop: 2 },
});
