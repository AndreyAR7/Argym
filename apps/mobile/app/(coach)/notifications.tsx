import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/auth.store';
import { formatRelativeTime } from '@/lib/timeUtils';
import type { AppNotification } from '@/services/notifications.service';

const NOTIF_ICON: Record<string, string> = {
  appointment_created:     '📅',
  appointment_confirmed:   '✅',
  appointment_cancelled:   '❌',
  appointment_completed:   '🏁',
  appointment_rescheduled: '🔄',
};

const NOTIF_COLOR: Record<string, string> = {
  appointment_created:     '#3b82f6',
  appointment_confirmed:   '#22c55e',
  appointment_cancelled:   '#ef4444',
  appointment_completed:   '#8b5cf6',
  appointment_rescheduled: '#f59e0b',
};

export default function CoachNotificationsScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { user } = useAuthStore();
  const {
    data, isLoading, isFetchingNextPage,
    fetchNextPage, hasNextPage, refetch, isFetching,
  } = useNotifications(user?.id);
  const markRead = useMarkRead(user?.id);
  const markAll  = useMarkAllRead(user?.id);

  const notifications: AppNotification[] = (data?.pages ?? []).flat();
  const unread = notifications.filter((n) => !n.is_read).length;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isUnread = !item.is_read;
    const accentColor = NOTIF_COLOR[item.type] ?? T.accent;

    return (
      <TouchableOpacity
        onPress={() => { if (isUnread) markRead.mutate(item.id); }}
        activeOpacity={isUnread ? 0.75 : 1}
        style={[
          s.card,
          {
            backgroundColor: isUnread ? accentColor + '10' : T.bgCard,
            borderColor:     isUnread ? accentColor + '44' : T.border,
            borderLeftColor: isUnread ? accentColor : T.border,
            borderLeftWidth: isUnread ? 3 : 1,
          },
        ]}
      >
        <View style={[s.iconBox, { backgroundColor: isUnread ? accentColor + '22' : T.bgCard }]}>
          <Text style={{ fontSize: 20 }}>{NOTIF_ICON[item.type] ?? '🔔'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: T.text, fontWeight: isUnread ? '700' : '400' }]}>
            {item.title}
          </Text>
          <Text style={[s.body, { color: T.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={[s.ts, { color: T.textMuted }]}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        {isUnread && <View style={[s.dot, { backgroundColor: accentColor }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: T.bg }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[s.screenTitle, { color: T.text }]}>{t('coach.notifications.title')}</Text>
          {unread > 0 && (
            <View style={[s.countBadge, { backgroundColor: T.accent }]}>
              <Text style={s.countText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={() => markAll.mutate()} activeOpacity={0.7}>
            <Text style={[s.markAll, { color: T.accent }]}>{t('coach.notifications.markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isFetching && !isLoading}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
              <Text style={[s.emptyText, { color: T.textMuted }]}>{t('coach.notifications.empty')}</Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator color={T.accent} size="small" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: { fontSize: 22, fontWeight: '800' },
  countBadge: {
    borderRadius: 10, minWidth: 20, height: 20,
    paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center',
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  markAll:   { fontSize: 13, fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  title:     { fontSize: 14, marginBottom: 2 },
  body:      { fontSize: 13, lineHeight: 18 },
  ts:        { fontSize: 11, marginTop: 4 },
  dot:       { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15 },
});
