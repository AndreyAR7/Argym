import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/auth.store';
import { formatRelativeTime } from '@/lib/timeUtils';
import type { AppNotification } from '@/services/notifications.service';

const NOTIF_ICON: Record<string, string> = {
  appointment_created: '📅',
  appointment_confirmed: '✅',
  appointment_cancelled: '❌',
  appointment_completed: '🏁',
  appointment_rescheduled: '🔄',
};

function NotifItem({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (id: string) => void;
}) {
  const T = useTheme();
  const icon = NOTIF_ICON[item.type] ?? '🔔';

  return (
    <TouchableOpacity
      onPress={() => !item.is_read && onPress(item.id)}
      activeOpacity={0.75}
      style={[
        styles.item,
        {
          backgroundColor: item.is_read ? T.bgCard : T.accentGlow,
          borderColor: item.is_read ? T.border : T.accent + '44',
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: T.bg }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, { color: T.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.itemBodyText, { color: T.textSecondary }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.itemTime, { color: T.textMuted }]}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </View>
      {!item.is_read && (
        <View style={[styles.unreadDot, { backgroundColor: T.blue }]} />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { user } = useAuthStore();
  const {
    data: notifPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(user?.id);
  const { mutate: markRead } = useMarkRead(user?.id);
  const { mutate: markAllRead } = useMarkAllRead(user?.id);

  const notifications: AppNotification[] = notifPages?.pages?.flat() ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ClientTopBar title={t('client.notifications.title')} />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={() => markAllRead()} style={styles.markAllRow}>
              <Text style={[styles.markAllText, { color: T.accent }]}>
                {t('client.notifications.markAllRead')}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={[styles.emptyTitle, { color: T.text }]}>{t('client.notifications.emptyTitle')}</Text>
            <Text style={[styles.emptyDesc, { color: T.textMuted }]}>
              {t('client.notifications.emptyDescription')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <NotifItem item={item} onPress={markRead} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  markAllRow: { alignItems: 'flex-end', marginBottom: 12 },
  markAllText: { fontSize: 13, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 20 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  itemBodyText: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  itemTime: { fontSize: 11 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
