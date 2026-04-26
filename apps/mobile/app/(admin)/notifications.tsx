import React, { useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { useAuthStore } from '@/store/auth.store';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import type { AppNotification } from '@/services/notifications.service';

const TYPE_ICON: Record<string, string> = {
  appointment_created:     '📅',
  appointment_confirmed:   '✅',
  appointment_cancelled:   '❌',
  appointment_completed:   '🏁',
  appointment_rescheduled: '🔄',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (itemDay.getTime() === today.getTime()) return 'Hoy';
  if (itemDay.getTime() === yesterday.getTime()) return 'Ayer';
  const diff = Math.floor((today.getTime() - itemDay.getTime()) / 86400000);
  if (diff < 7) return `Hace ${diff} días`;
  return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' });
}

type ListItem =
  | { _type: 'header'; id: string; label: string }
  | { _type: 'notif'; id: string; notif: AppNotification };

export default function AdminNotificationsScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const {
    data, isLoading, isFetchingNextPage,
    fetchNextPage, hasNextPage, refetch, isFetching,
  } = useNotifications(user?.id);
  const markRead = useMarkRead(user?.id);
  const markAll = useMarkAllRead(user?.id);

  // Flatten pages
  const notifications: AppNotification[] = useMemo(
    () => (data?.pages ?? []).flat(),
    [data]
  );

  const unread = notifications.filter((n) => !n.is_read).length;

  // Build sectioned list: group by day with headers
  const listData: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    let lastKey = '';
    for (const n of notifications) {
      const key = dayKey(n.created_at);
      if (key !== lastKey) {
        items.push({ _type: 'header', id: `header-${key}`, label: dayLabel(n.created_at) });
        lastKey = key;
      }
      items.push({ _type: 'notif', id: n.id, notif: n });
    }
    return items;
  }, [notifications]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item._type === 'header') {
      return (
        <View style={[s.sectionHeader, { borderBottomColor: T.border }]}>
          <Text style={[s.sectionLabel, { color: T.textMuted }]}>{item.label}</Text>
        </View>
      );
    }

    const notif = item.notif;
    const isUnread = !notif.is_read;

    return (
      <TouchableOpacity
        onPress={() => { if (isUnread) markRead.mutate(notif.id); }}
        activeOpacity={isUnread ? 0.75 : 1}
        style={[s.card, {
          backgroundColor: isUnread ? T.accent + '10' : T.bgCard,
          borderColor: isUnread ? T.accent + '44' : T.border,
          borderLeftWidth: isUnread ? 3 : 1,
          borderLeftColor: isUnread ? T.accent : T.border,
        }]}
      >
        <View style={[s.iconBox, { backgroundColor: isUnread ? T.accent + '22' : T.bgSurface }]}>
          <Text style={{ fontSize: 20 }}>{TYPE_ICON[notif.type] ?? '🔔'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: T.text, fontWeight: isUnread ? '700' : '400' }]}>
            {notif.title}
          </Text>
          <Text style={[s.msg, { color: T.textSecondary }]} numberOfLines={2}>
            {notif.message}
          </Text>
          <Text style={[s.time, { color: T.textMuted }]}>{formatTime(notif.created_at)}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}>
          {isUnread && <View style={[s.dot, { backgroundColor: T.accent }]} />}
          {isUnread && (
            <TouchableOpacity onPress={() => markRead.mutate(notif.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 10, color: T.accent, fontWeight: '700' }}>✓ Leída</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar
        title="Notificaciones"
        subtitle={unread > 0 ? `${unread} sin leer` : 'Todo al día'}
        actionLabel={unread > 0 ? 'Marcar todo' : undefined}
        onAction={unread > 0 ? () => markAll.mutate() : undefined}
      />

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={T.accent} size="large" /></View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
              <Text style={{ color: T.textMuted, fontSize: 15 }}>Sin notificaciones</Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator color={T.accent} size="small" />
              </View>
            ) : null
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  sectionHeader: {
    paddingVertical: 8, marginBottom: 6, marginTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, marginBottom: 2 },
  msg: { fontSize: 13, lineHeight: 18 },
  time: { fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
