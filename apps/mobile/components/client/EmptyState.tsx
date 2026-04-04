import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '✨', title, description, actionLabel, onAction }: Props) {
  const T = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconBg, { backgroundColor: T.accentGlow }]}>
        <Text style={{ fontSize: 36 }}>{icon}</Text>
      </View>
      <Text style={[styles.title, { color: T.text }]}>{title}</Text>
      {description && <Text style={[styles.desc, { color: T.textSecondary }]}>{description}</Text>}
      {actionLabel && (
        <TouchableOpacity onPress={onAction} style={[styles.btn, { backgroundColor: T.accent, borderRadius: T.radiusMd }]}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  iconBg: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btn: { paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
