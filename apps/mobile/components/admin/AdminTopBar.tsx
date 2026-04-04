import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useSidebarStore } from '@/store/sidebar.store';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
}

export function AdminTopBar({ title, subtitle, actionLabel, actionIcon, onAction }: Props) {
  const T = useTheme();
  const { open } = useSidebarStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8, backgroundColor: T.bg, borderBottomColor: T.border }]}>
      <TouchableOpacity onPress={open} style={[styles.menuBtn, { backgroundColor: T.bgCard, borderColor: T.border }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={[styles.menuLine, { backgroundColor: T.textSecondary }]} />
        <View style={[styles.menuLine, { width: 16, backgroundColor: T.textSecondary }]} />
        <View style={[styles.menuLine, { backgroundColor: T.textSecondary }]} />
      </TouchableOpacity>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: T.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: T.textMuted }]}>{subtitle}</Text>}
      </View>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} style={[styles.actionBtn, { backgroundColor: T.accent }]}>
          {actionIcon && <Text style={{ fontSize: 13 }}>{actionIcon}</Text>}
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  menuBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1 },
  menuLine: { width: 18, height: 2, borderRadius: 1 },
  titleBlock: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 11, marginTop: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
