import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  onBack?: () => void;
}

export function ManagementHeader({ title, subtitle, actionLabel, actionIcon, onAction, onBack }: Props) {
  const T = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: T.border, backgroundColor: T.bg }]}>
      <View style={styles.left}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: T.bgCard }]}>
            <Text style={[styles.backText, { color: T.text }]}>←</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={[styles.title, { color: T.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: T.textMuted }]}>{subtitle}</Text>}
        </View>
      </View>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} style={[styles.actionBtn, { backgroundColor: T.accent, borderRadius: T.radiusMd }]}>
          {actionIcon && <Text style={{ fontSize: 14 }}>{actionIcon}</Text>}
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 18 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
