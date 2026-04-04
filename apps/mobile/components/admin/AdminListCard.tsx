import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: { label: string; color: string };
  icon?: string;
  iconBg?: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
}

export function AdminListCard({ title, subtitle, meta, badge, icon, iconBg, onPress, rightContent }: Props) {
  const T = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.card, { backgroundColor: T.bgCard, borderColor: T.border, borderRadius: T.radiusMd, ...T.shadowCard }]}>
      {icon && (
        <View style={[styles.iconBg, { backgroundColor: iconBg ?? T.accentGlow }]}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: T.text }]} numberOfLines={1}>{title}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.color + '22' }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={[styles.subtitle, { color: T.textSecondary }]} numberOfLines={1}>{subtitle}</Text>}
        {meta && <Text style={[styles.meta, { color: T.textMuted }]}>{meta}</Text>}
      </View>
      {rightContent ?? <Text style={[styles.arrow, { color: T.textMuted }]}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, gap: 12, borderWidth: 1 },
  iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  badge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  subtitle: { fontSize: 12 },
  meta: { fontSize: 11, marginTop: 2 },
  arrow: { fontSize: 20 },
});
