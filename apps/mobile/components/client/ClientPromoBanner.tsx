import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  title: string;
  description?: string;
  discountPct?: number;
  endDate?: string;
  onPress?: () => void;
  onDismiss?: () => void;
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export function ClientPromoBanner({ title, description, discountPct, endDate, onPress, onDismiss }: Props) {
  const T = useTheme();
  const days = endDate ? daysLeft(endDate) : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}
      style={[styles.banner, { borderColor: T.accent + '44', borderRadius: T.radiusLg, ...T.shadowCard }]}>
      <View style={[styles.glow, { backgroundColor: T.accent + '18' }]} />
      <View style={styles.left}>
        {discountPct && (
          <View style={[styles.discountBadge, { backgroundColor: T.accent }]}>
            <Text style={styles.discountText}>{discountPct}% OFF</Text>
          </View>
        )}
        <Text style={[styles.title, { color: T.text }]} numberOfLines={1}>{title}</Text>
        {description && <Text style={[styles.desc, { color: T.textSecondary }]} numberOfLines={2}>{description}</Text>}
        {days !== null && (
          <Text style={[styles.countdown, { color: T.gold }]}>
            ⏱ {days === 0 ? 'Último día' : `${days} días restantes`}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={[styles.cta, { color: T.accent }]}>Ver →</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.dismiss, { color: T.textMuted }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#1A1030', borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', top: -20, left: -20, width: 120, height: 120, borderRadius: 60 },
  left: { flex: 1 },
  discountBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  discountText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  desc: { fontSize: 12, lineHeight: 17 },
  countdown: { fontSize: 11, fontWeight: '600', marginTop: 6 },
  right: { alignItems: 'flex-end', gap: 8, paddingLeft: 12 },
  cta: { fontWeight: '700', fontSize: 14 },
  dismiss: { fontSize: 16 },
});
