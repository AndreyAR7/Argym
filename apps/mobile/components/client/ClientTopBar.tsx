import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useClientSidebarStore } from '@/store/clientSidebar.store';
import { AppLogo } from '@/components/shared/AppLogo';

interface Props {
  title?: string;
  showTitle?: boolean;
  rightContent?: React.ReactNode;
}

export function ClientTopBar({ title, showTitle = true, rightContent }: Props) {
  const T = useTheme();
  const { open } = useClientSidebarStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6, backgroundColor: T.bg }]}>
      <TouchableOpacity onPress={open} style={[styles.menuBtn, { backgroundColor: T.bgCard, borderColor: T.border }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={[styles.line, { backgroundColor: T.textSecondary }]} />
        <View style={[styles.line, { width: 14, backgroundColor: T.textSecondary }]} />
        <View style={[styles.line, { backgroundColor: T.textSecondary }]} />
      </TouchableOpacity>
      {showTitle && title ? (
        <Text style={[styles.title, { color: T.text }]}>{title}</Text>
      ) : (
        // Show logo when no title (home screen)
        <AppLogo size={36} style={{ flex: 1 }} />
      )}
      {rightContent ?? <View style={{ width: 36 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  menuBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1 },
  line: { width: 18, height: 2, borderRadius: 1 },
  title: { flex: 1, fontSize: 17, fontWeight: '700' },
});
