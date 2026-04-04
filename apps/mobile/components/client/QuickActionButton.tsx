import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  icon: string;
  label: string;
  onPress?: () => void;
  accent?: string;
}

export function QuickActionButton({ icon, label, onPress, accent }: Props) {
  const T = useTheme();
  const resolvedAccent = accent ?? T.accent;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.btn}>
      <Text style={[styles.icon, { backgroundColor: resolvedAccent + '22' }]}>{icon}</Text>
      <Text style={[styles.label, { color: T.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', gap: 6, flex: 1 },
  icon: { fontSize: 22, width: 52, height: 52, borderRadius: 16, textAlign: 'center', lineHeight: 52, overflow: 'hidden' },
  label: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});
